const prisma = require("../db/prismaClient");
const asyncHandler = require("../middleware/asyncHandler");

const fightInclude = {
  fighterA: true,
  fighterB: true,
  officialWinner: true,
};

// Fighters are looked up by name (case-insensitive) and reused if they
// already exist, so the same fighter appearing on multiple cards doesn't
// create duplicate rows — this is what makes a future "fighter profile"
// page (all bouts for one fighter) possible without extra migration work.
async function findOrCreateFighter(tx, name) {
  const existing = await tx.fighter.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) return existing;
  return tx.fighter.create({ data: { name } });
}

// GET /events
const listEvents = asyncHandler(async (req, res) => {
  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: { fights: { include: fightInclude } },
  });
  res.json({ events });
});

// GET /events/:id
const getEvent = asyncHandler(async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { fights: { include: fightInclude } },
  });
  if (!event) return res.status(404).json({ message: "Event not found" });
  res.json({ event });
});

// POST /events — organizer only. Creates the event and its main event fight.
const createEvent = asyncHandler(async (req, res) => {
  const { name, venue, date, fighterAName, fighterBName, weightClass, scheduledRounds, titles } = req.body;

  const event = await prisma.$transaction(async (tx) => {
    const fighterA = await findOrCreateFighter(tx, fighterAName);
    const fighterB = await findOrCreateFighter(tx, fighterBName);

    return tx.event.create({
      data: {
        name,
        venue,
        date: new Date(date),
        createdById: req.user.id,
        fights: {
          create: {
            isMainEvent: true,
            weightClass,
            scheduledRounds: scheduledRounds || 12,
            titles: titles || [],
            fighterAId: fighterA.id,
            fighterBId: fighterB.id,
          },
        },
      },
      include: { fights: { include: fightInclude } },
    });
  });

  res.status(201).json({ event });
});

// POST /events/:id/fights — organizer only. Adds an undercard bout.
const addUndercardFight = asyncHandler(async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ message: "Event not found" });

  const { fighterAName, fighterBName, weightClass, scheduledRounds, titles } = req.body;

  const fight = await prisma.$transaction(async (tx) => {
    const fighterA = await findOrCreateFighter(tx, fighterAName);
    const fighterB = await findOrCreateFighter(tx, fighterBName);

    return tx.fight.create({
      data: {
        eventId: event.id,
        isMainEvent: false,
        weightClass,
        scheduledRounds: scheduledRounds || 10,
        titles: titles || [],
        fighterAId: fighterA.id,
        fighterBId: fighterB.id,
      },
      include: fightInclude,
    });
  });

  res.status(201).json({ fight });
});

module.exports = { listEvents, getEvent, createEvent, addUndercardFight };
