const { Router } = require("express");
const fightsController = require("../controller/fightsController");

const router = Router();

router.get("/:id", fightsController.getFight);

module.exports = router;
