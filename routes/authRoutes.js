const { Router } = require("express");
const { body } = require("express-validator");
const authController = require("../controller/authController");
const requireAuth = require("../middleware/requireAuth");
const validate = require("../middleware/validate");
const { loginLimiter, registerLimiter ,passwordResetLimiter } = require("../middleware/rateLimiter");

const router = Router();

router.post(
  "/register",
  registerLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  validate,
  authController.register
);

router.post(
  "/login",
  loginLimiter,
  [body("email").isEmail().withMessage("A valid email is required"), body("password").notEmpty().withMessage("Password is required")],
  validate,
  authController.login
);

router.get("/me", requireAuth, authController.me);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

router.post(
  "/forgot-password",
  passwordResetLimiter,
  [body("email").isEmail().withMessage("A valid email is required").normalizeEmail()],
  validate,
  authController.forgotPassword
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  [
    body("userId").notEmpty().withMessage("userId is required"),
    body("token").notEmpty().withMessage("token is required"),
    body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  validate,
  authController.resetPassword
);

module.exports = router;
