const { Router } = require("express");
const { body } = require("express-validator");
const scorecardsController = require("../controller/scorecardsController");
const requireAuth = require("../middleware/requireAuth");
const validate = require("../middleware/validate");

const router = Router();

router.use(requireAuth); // every scorecard route is personal — auth required throughout

router.get("/mine", scorecardsController.myScorecards);

router.post("/", [body("fightId").notEmpty().withMessage("fightId is required")], validate, scorecardsController.getOrCreateScorecard);

router.patch(
  "/:id",
  [body("rounds").isArray().withMessage("rounds must be an array")],
  validate,
  scorecardsController.updateRounds
);

router.post(
  "/:id/finalize",
  [
    body("type").isIn(["decision", "stoppage"]).withMessage("type must be 'decision' or 'stoppage'"),
    body("winner").notEmpty().withMessage("winner is required ('draw' or a fighter's name)"),
    body("stoppageCode").optional().isIn(["KO", "TKO", "DQ", "NC"]),
    body("roundStopped").optional().isInt({ min: 1 }),
    body("totalA").optional().isInt({ min: 0 }),
    body("totalB").optional().isInt({ min: 0 }),
  ],
  validate,
  scorecardsController.finalizeScorecard
);

module.exports = router;
