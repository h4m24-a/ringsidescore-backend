const bcrypt = require("bcrypt");
const prisma = require("./prismaClient");

const SALT_ROUNDS = 12;

// ---- Auth: users ----

async function insertUser({ name, email, passwordHash }) {
  try {
    return await prisma.user.create({
      data: { name, email: email.toLowerCase(), passwordHash },
    });
  } catch (error) {
    console.error("Error creating user", error);
    throw error;
  }
}

async function findUserByEmail(email) {
  try {
    return await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  } catch (error) {
    console.error("Error finding user", error);
    throw error;
  }
}

async function selectUserById(id) {
  try {
    return await prisma.user.findUnique({ where: { id } });
  } catch (error) {
    console.error("Error finding user", error);
    throw error;
  }
}

// ---- JWT: refresh tokens ----
// The raw refresh token is never stored — only its bcrypt hash, the same
// way a password is handled. `getRefreshTokenHashByUserId` therefore doesn't
// return a usable token; use `verifyStoredRefreshToken` to check a
// presented token against what's on file.

async function storeRefreshToken(userId, refreshToken, expiresAt) {
  try {
    const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash, refreshTokenExpiresAt: expiresAt },
    });
  } catch (error) {
    console.error("Error storing refresh token", error);
    throw error;
  }
}

async function getRefreshTokenHashByUserId(userId) {
  try {
    const user = await prisma.user.findUnique({
      select: { refreshTokenHash: true, refreshTokenExpiresAt: true },
      where: { id: userId },
    });
    return user; // { refreshTokenHash, refreshTokenExpiresAt } | null
  } catch (error) {
    console.error("Failed to retrieve refresh token of user", error);
    throw error;
  }
}

async function verifyStoredRefreshToken(userId, presentedToken) {
  const record = await getRefreshTokenHashByUserId(userId);
  if (!record || !record.refreshTokenHash) return false;
  if (record.refreshTokenExpiresAt && record.refreshTokenExpiresAt < new Date()) return false;
  return bcrypt.compare(presentedToken, record.refreshTokenHash);
}

async function deleteRefreshToken(userId) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
    });
  } catch (error) {
    console.error("Failed to delete refresh token", error);
    throw error;
  }
}

// ---- password reset ----
// Same principle as refresh tokens: only the hash is ever stored, never the
// raw token that goes out in the email link.

async function storePasswordResetToken(userId, resetToken, expiresAt) {
  try {
    const passwordResetTokenHash = await bcrypt.hash(resetToken, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordResetTokenHash, passwordResetTokenExpiresAt: expiresAt },
    });
  } catch (error) {
    console.error("Error storing password reset token", error);
    throw error;
  }
}

async function verifyStoredPasswordResetToken(userId, presentedToken) {
  try {
    const user = await prisma.user.findUnique({
      select: { passwordResetTokenHash: true, passwordResetTokenExpiresAt: true },
      where: { id: userId },
    });
    if (!user || !user.passwordResetTokenHash) return false;
    if (user.passwordResetTokenExpiresAt && user.passwordResetTokenExpiresAt < new Date()) return false;
    return bcrypt.compare(presentedToken, user.passwordResetTokenHash);
  } catch (error) {
    console.error("Failed to verify password reset token", error);
    throw error;
  }
}

async function clearPasswordResetToken(userId) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordResetTokenHash: null, passwordResetTokenExpiresAt: null },
    });
  } catch (error) {
    console.error("Failed to clear password reset token", error);
    throw error;
  }
}

// Updates the password hash and, as a security measure, revokes the user's
// refresh token too — a password reset should force re-login everywhere.
async function updatePasswordAndRevokeSessions(userId, passwordHash) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  } catch (error) {
    console.error("Failed to update password", error);
    throw error;
  }
}

module.exports = {
  insertUser,
  findUserByEmail,
  selectUserById,
  storeRefreshToken,
  getRefreshTokenHashByUserId,
  verifyStoredRefreshToken,
  deleteRefreshToken,
  storePasswordResetToken,
  verifyStoredPasswordResetToken,
  clearPasswordResetToken,
  updatePasswordAndRevokeSessions,
};
