const prisma = require("../db/prismaClient");
const asyncHandler = require("../middleware/asyncHandler");

function emptyRounds(n) {
  return Array.from({ length: n }, (_, i) => ({
    round: i + 1,
    a: null,
    b: null,
    even: false,
    knockdownA: false,
    knockdownB: false,
  }));
}

const scorecardInclude = {
  fight: { include: { fighterA: true, fighterB: true, event: true } },
  winnerFighter: true,
};

// POST /scorecards — body: { fightId }. Returns the user's existing live/final
// scorecard for that fight, or creates a fresh one.
const getOrCreateScorecard = asyncHandler(async (req, res) => {
  const { fightId } = req.body;

  const existing = await prisma.scorecard.findUnique({
    where: { userId_fightId: { userId: req.user.id, fightId } },
    include: scorecardInclude,
  });
  if (existing) return res.json({ scorecard: existing });

  const fight = await prisma.fight.findUnique({ where: { id: fightId } });
  if (!fight) return res.status(404).json({ message: "Fight not found" });

  const scorecard = await prisma.scorecard.create({
    data: {
      userId: req.user.id,
      fightId,
      rounds: emptyRounds(fight.scheduledRounds),
    },
    include: scorecardInclude,
  });

  res.status(201).json({ scorecard });
});

// PATCH /scorecards/:id — body: { rounds }. Saves in-progress round scoring.
const updateRounds = asyncHandler(async (req, res) => {
  const scorecard = await prisma.scorecard.findUnique({ where: { id: req.params.id } });
  if (!scorecard) return res.status(404).json({ message: "Scorecard not found" });
  if (scorecard.userId !== req.user.id) return res.status(403).json({ message: "This isn't your scorecard" });
  if (scorecard.status !== "LIVE") return res.status(409).json({ message: "Scorecard is already finalized" });

  const updated = await prisma.scorecard.update({
    where: { id: scorecard.id },
    data: { rounds: req.body.rounds },
    include: scorecardInclude,
  });

  res.json({ scorecard: updated });
});

// POST /scorecards/:id/finalize
// body: { type: 'decision' | 'stoppage', winner, stoppageCode?, roundStopped?, totalA, totalB }
// `winner` is either "draw" or the exact fighter name (matched against the fight's fighterA/fighterB).
const finalizeScorecard = asyncHandler(async (req, res) => {
  const scorecard = await prisma.scorecard.findUnique({
    where: { id: req.params.id },
    include: { fight: { include: { fighterA: true, fighterB: true } } },
  });
  if (!scorecard) return res.status(404).json({ message: "Scorecard not found" });
  if (scorecard.userId !== req.user.id) return res.status(403).json({ message: "This isn't your scorecard" });
  if (scorecard.status !== "LIVE") return res.status(409).json({ message: "Scorecard is already finalized" });

  const { type, winner, stoppageCode, roundStopped, totalA, totalB } = req.body;
  const { fighterA, fighterB } = scorecard.fight;

  const isDraw = winner === "draw";
  let winnerFighterId = null;
  if (!isDraw) {
    if (winner === fighterA.name) winnerFighterId = fighterA.id;
    else if (winner === fighterB.name) winnerFighterId = fighterB.id;
    else return res.status(422).json({ message: "winner must be 'draw' or match one of the fighters in this bout" });
  }

  const updated = await prisma.scorecard.update({
    where: { id: scorecard.id },
    data: {
      status: "FINAL",
      resultType: type,
      stoppageCode: type === "stoppage" ? stoppageCode : null,
      roundStopped: type === "stoppage" ? roundStopped : null,
      winnerFighterId,
      isDraw,
      totalA,
      totalB,
      finalizedAt: new Date(),
    },
    include: scorecardInclude,
  });

  res.json({ scorecard: updated });
});

// GET /scorecards/mine
const myScorecards = asyncHandler(async (req, res) => {
  const scorecards = await prisma.scorecard.findMany({
    where: { userId: req.user.id, status: "FINAL" },
    include: scorecardInclude,
    orderBy: { finalizedAt: "desc" },
  });
  res.json({ scorecards });
});

module.exports = { getOrCreateScorecard, updateRounds, finalizeScorecard, myScorecards };
