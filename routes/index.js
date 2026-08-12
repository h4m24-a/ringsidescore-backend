const { Router } = require("express");

const authRoutes = require("./authRoutes");
const eventsRoutes = require("./eventsRoutes");
const fightsRoutes = require("./fightsRoutes");
const scorecardsRoutes = require("./scorecardsRoutes");
const usersRoutes = require("./usersRoutes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/events", eventsRoutes);
router.use("/fights", fightsRoutes);
router.use("/scorecards", scorecardsRoutes);
router.use("/users", usersRoutes);

module.exports = router;
