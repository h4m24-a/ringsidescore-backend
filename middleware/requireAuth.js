const passport = require("passport");

// Wraps passport's jwt strategy so a missing/invalid token returns a clean
// 401 JSON response instead of passport's default behavior.
function requireAuth(req, res, next) {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    req.user = user;
    next();
  })(req, res, next);
}

module.exports = requireAuth;
