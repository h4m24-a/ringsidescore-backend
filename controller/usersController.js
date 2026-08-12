const bcrypt = require("bcrypt");
const prisma = require("../db/prismaClient");
const asyncHandler = require("../middleware/asyncHandler");
const { updatePasswordAndRevokeSessions } = require("../db/userQueries");

const SALT_ROUNDS = 12;

function roundAgreement(userRounds, officialRoundWinners) {
  let correct = 0;
  let compared = 0;
  officialRoundWinners.forEach((officialPick, i) => {
    const r = userRounds[i];
    if (!r || r.a == null) return;
    const userPick = r.even ? "EVEN" : r.a > r.b ? "A" : r.b > r.a ? "B" : "EVEN";
    compared++;
    if (userPick === officialPick) correct++;
  });
  return compared > 0 ? Math.round((correct / compared) * 100) : null;
}

// GET /users/me/accuracy — compares the current user's finalized scorecards
// against each fight's official result, where one has been recorded.
const getMyAccuracy = asyncHandler(async (req, res) => {
  const scorecards = await prisma.scorecard.findMany({
    where: { userId: req.user.id, status: "FINAL" },
    include: { fight: true },
  });

  const comparable = scorecards.filter((sc) => sc.fight.officialRoundWinners || sc.fight.officialWinnerId || sc.fight.officialResultIsDraw);

  let winnerMatches = 0;
  const roundAccuracies = [];

  comparable.forEach((sc) => {
    const officialIsDraw = sc.fight.officialResultIsDraw;
    const winnerMatch = officialIsDraw ? sc.isDraw : !officialIsDraw && sc.winnerFighterId === sc.fight.officialWinnerId;
    if (winnerMatch) winnerMatches++;

    if (Array.isArray(sc.fight.officialRoundWinners)) {
      const acc = roundAgreement(sc.rounds, sc.fight.officialRoundWinners);
      if (acc != null) roundAccuracies.push(acc);
    }
  });

  res.json({
    fightsScored: scorecards.length,
    fightsComparable: comparable.length,
    winnerAccuracy: comparable.length ? Math.round((winnerMatches / comparable.length) * 100) : null,
    avgRoundAccuracy: roundAccuracies.length
      ? Math.round(roundAccuracies.reduce((sum, v) => sum + v, 0) / roundAccuracies.length)
      : null,
  });
});

// PATCH /users/me/password — body: { currentPassword, newPassword }
// Requires the current password (unlike /auth/reset-password, which uses an
// emailed token instead — this is the "change it while logged in" flow).
// Also revokes the refresh token, same as a token-based reset, so the
// person needs to sign back in afterward — consistent behavior either way.
const updateMyPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const valid = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await updatePasswordAndRevokeSessions(req.user.id, passwordHash);

  res.clearCookie("ringside_refresh", { path: "/api/auth" });
  res.json({ message: "Password updated. Please sign in again." });
});

module.exports = { getMyAccuracy, updateMyPassword };
