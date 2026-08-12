const { Router } = require("express");
const { body } = require("express-validator");
const eventsController = require("../controller/eventsController");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");

const router = Router();

const ALLOWED_ORGS = ["WBC", "WBA", "IBF", "WBO", "RING"];

const eventFightValidation = [
  body("fighterAName").trim().notEmpty().withMessage("Fighter A name is required"),
  body("fighterBName").trim().notEmpty().withMessage("Fighter B name is required"),
  body("weightClass").trim().notEmpty().withMessage("Weight class is required"),
  body("scheduledRounds").optional().isInt({ min: 1, max: 15 }).withMessage("Scheduled rounds must be a small positive number"),
  body("titles").optional().isArray().withMessage("Titles must be an array"),
  body("titles.*").optional().isIn(ALLOWED_ORGS).withMessage(`Each title must be one of ${ALLOWED_ORGS.join(", ")}`),
];

// public reads
router.get("/", eventsController.listEvents);
router.get("/:id", eventsController.getEvent);

// organizer-only writes
router.post(
  "/",
  requireAuth,
  requireRole("ORGANIZER", "ADMIN"),
  [
    body("name").trim().notEmpty().withMessage("Event name is required"),
    body("venue").trim().notEmpty().withMessage("Location is required"),
    body("date").isISO8601().withMessage("A valid date is required"),
    ...eventFightValidation,
  ],
  validate,
  eventsController.createEvent
);

router.post(
  "/:id/fights",
  requireAuth,
  requireRole("ORGANIZER", "ADMIN"),
  eventFightValidation,
  validate,
  eventsController.addUndercardFight
);

module.exports = router;
