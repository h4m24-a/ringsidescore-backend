const bcrypt = require("bcrypt");
const prisma = require("../db/prismaClient");

const PASSWORD = process.env.ORGANIZER_PW;

async function findOrCreateFighter(name) {
  const existing = await prisma.fighter.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.fighter.create({ data: { name } });
}

async function main() {
  if (!PASSWORD) throw new Error("ORGANIZER_PW is required");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);  // organizer user
  const organizer = await prisma.user.upsert({
    where: { email: "organizer@ringside.app" },
    update: {},
    create: { name: "Demo Organizer", email: "organizer@ringside.app", passwordHash, role: "ORGANIZER" },
  });
const benavidez = await findOrCreateFighter("David Benavidez");
const yarde = await findOrCreateFighter("Anthony Yarde");
const haney = await findOrCreateFighter("Devin Haney");
const norman = await findOrCreateFighter("Brian Norman Jr.");
const rodriguez = await findOrCreateFighter("Jesse Rodriguez");
const martinez = await findOrCreateFighter("Fernando Martinez");
const mason = await findOrCreateFighter("Abdullah Mason");
const noakes = await findOrCreateFighter("Sam Noakes");

await prisma.event.create({
  data: {
    name: "Benavidez vs. Yarde",
    venue: "ANB Arena, Riyadh, Saudi Arabia",
    date: new Date("2025-11-22"),
    createdById: organizer.id,
    fights: {
      create: [
        {
          isMainEvent: true,
          weightClass: "Light Heavyweight",
          scheduledRounds: 12,
          titles: ["WBC"],
          fighterAId: benavidez.id,
          fighterBId: yarde.id,
          officialMethod: "TKO",
          officialStoppageCode: "TKO",
          officialRoundStopped: 7,
          officialWinnerId: benavidez.id,
          officialRoundWinners: [
            "A",
            "A",
            "A",
            "B",
            "A",
            "A",
            "A",
          ],
        },
        {
          isMainEvent: false,
          weightClass: "Welterweight",
          scheduledRounds: 12,
          titles: ["WBO"],
          fighterAId: haney.id,
          fighterBId: norman.id,
          officialMethod: "Unanimous Decision",
          officialWinnerId: norman.id,
          officialRoundWinners: [
            "B",
            "A",
            "B",
            "B",
            "A",
            "B",
            "B",
            "A",
            "B",
            "B",
            "A",
            "B",
          ],
        },
        {
          isMainEvent: false,
          weightClass: "Super Flyweight",
          scheduledRounds: 12,
          titles: ["WBA", "WBC", "IBF"],
          fighterAId: rodriguez.id,
          fighterBId: martinez.id,
          officialMethod: "Unanimous Decision",
          officialWinnerId: rodriguez.id,
          officialRoundWinners: [
            "A",
            "A",
            "B",
            "A",
            "A",
            "B",
            "A",
            "A",
            "B",
            "A",
            "A",
            "A",
          ],
        },
        {
          isMainEvent: false,
          weightClass: "Lightweight",
          scheduledRounds: 12,
          titles: ["WBO"],
          fighterAId: mason.id,
          fighterBId: noakes.id,
          officialMethod: "TKO",
          officialStoppageCode: "TKO",
          officialRoundStopped: 5,
          officialWinnerId: mason.id,
          officialRoundWinners: [
            "A",
            "A",
            "A",
            "A",
            "A",
          ],
        },
      ],
    },
  },
});
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
