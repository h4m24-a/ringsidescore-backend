const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { insertUser, findUserByEmail, selectUserById, storeRefreshToken, verifyStoredRefreshToken, deleteRefreshToken, storePasswordResetToken, verifyStoredPasswordResetToken, updatePasswordAndRevokeSessions, } = require("../db/userQueries");
const asyncHandler = require("../middleware/asyncHandler");
const { sendPasswordResetEmail } = require('../middleware/email')

const SALT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = "ringside_refresh";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour — shorter-lived than the refresh token since it's higher-risk



function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });
}



function signRefreshToken(user) {
  // Signed with a *different* secret than the access token, so a leaked
  // access-token secret alone can't be used to forge refresh tokens.
  return jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });
}



function refreshCookieOptions() {
  return {
    httpOnly: true, // not readable by client-side JS — the main XSS protection here
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod; allow http in local dev
    sameSite: "none", // allow cross-site requests (frontend and backend are on different origins)
    partitioned: "true", // don't send the cookie on cross-site requests that aren't same-site
    path: "/", // only sent to auth routes, not every request
    maxAge: REFRESH_TOKEN_TTL_MS,
  };
}




// Issues a fresh access + refresh token pair, stores the refresh token's
// hash against the user, and sets it as an httpOnly cookie on the response.
async function issueTokens(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await storeRefreshToken(user.id, refreshToken, new Date(Date.now() + REFRESH_TOKEN_TTL_MS));
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

  return accessToken;
}


function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}



// POST /auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: "An account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await insertUser({ name, email, passwordHash });

  const accessToken = await issueTokens(res, user);
  res.status(201).json({ user: toPublicUser(user), accessToken });
});




// POST /auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ message: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Invalid email or password" });

  const accessToken = await issueTokens(res, user);
  res.json({ user: toPublicUser(user), accessToken });
});




// POST /auth/refresh — reads the httpOnly cookie, rotates the refresh token,
// and issues a new short-lived access token.
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) return res.status(401).json({ message: "No refresh token" });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);  //  If verification is successful return decoded payload
  } catch {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    return res.status(401).json({ message: "Refresh token invalid or expired" });
  }

  const valid = await verifyStoredRefreshToken(payload.sub, token);
  if (!valid) {
    // Presented token doesn't match what's on file — could be a stale/reused
    // token after rotation. Revoke whatever's stored and force a fresh login.
    await deleteRefreshToken(payload.sub);
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    return res.status(401).json({ message: "Refresh token invalid or expired" });
  }

  const user = await selectUserById(payload.sub);
  if (!user) return res.status(401).json({ message: "User no longer exists" });

  // Rotate: issue a brand new refresh token and overwrite the stored hash,
  // so the old one can never be used again even if it leaked.
  const accessToken = await issueTokens(res, user);
  res.json({ user: toPublicUser(user), accessToken });
});




// POST /auth/logout — revokes the stored refresh token and clears the cookie.
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await deleteRefreshToken(payload.sub);
    } catch {
      // token already invalid/expired — nothing to revoke
    }
  }
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
  res.status(204).send();
});





// POST /auth/forgot-password — body: { email }. Always responds with the
// same generic message whether or not the email exists, so this endpoint
// can't be used to check which emails are registered.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await findUserByEmail(email);

  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    await storePasswordResetToken(user.id, resetToken, new Date(Date.now() + PASSWORD_RESET_TTL_MS));

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?userId=${user.id}&token=${resetToken}`;

    await sendPasswordResetEmail({
      to: email,
      resetLink: resetLink
    })
  }

  res.json({ message: "If that email is registered, a password reset link has been sent." });
});




// POST /auth/reset-password — body: { userId, token, newPassword }
const resetPassword = asyncHandler(async (req, res) => {
  const { userId, token, newPassword } = req.body;

  const valid = await verifyStoredPasswordResetToken(userId, token);
  if (!valid) {
    return res.status(400).json({ message: "This reset link is invalid or has expired." });
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  // Also revokes the refresh token — a password reset should force
  // re-login on every device, not just the one doing the reset.
  await updatePasswordAndRevokeSessions(userId, passwordHash);
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());

  res.json({ message: "Password updated. Please sign in again." });
});

// GET /auth/me — req.user is populated by requireAuth
const me = asyncHandler(async (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

module.exports = { register, login, refresh, logout, me, forgotPassword, resetPassword };
