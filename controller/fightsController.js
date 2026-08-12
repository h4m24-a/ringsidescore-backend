const prisma = require("../db/prismaClient");
const asyncHandler = require("../middleware/asyncHandler");

// GET /fights/:id
const getFight = asyncHandler(async (req, res) => {
  const fight = await prisma.fight.findUnique({
    where: { id: req.params.id },
    include: { fighterA: true, fighterB: true, officialWinner: true, event: true },
  });
  if (!fight) return res.status(404).json({ message: "Fight not found" });
  res.json({ fight });
});

module.exports = { getFight };
