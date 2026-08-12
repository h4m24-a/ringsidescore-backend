const { Router } = require("express");
const { body } = require("express-validator");
const usersController = require("../controller/usersController");
const requireAuth = require("../middleware/requireAuth");
const validate = require("../middleware/validate");

const router = Router();

router.get("/me/accuracy", requireAuth, usersController.getMyAccuracy);

router.patch(
  "/me/password",
  requireAuth,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 8 }).withMessage("New password must be at least 8 characters"),
  ],
  validate,
  usersController.updateMyPassword
);

module.exports = router;
