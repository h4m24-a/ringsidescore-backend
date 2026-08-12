// Singleton PrismaClient — importing this everywhere (instead of
// `new PrismaClient()` in every file) avoids exhausting Postgres connections
// during dev hot-reloads.
//
// Prisma 7 requires a driver adapter for every database — there's no
// bundled query engine anymore, so the pg driver adapter is what actually
// opens the connection. Note: the client is imported from the generated
// output path (set in schema.prisma's generator block), not from
// "@prisma/client" directly.
const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // the pg driver has no default connection timeout (unlike Prisma's old
  // Rust engine) — set sane limits so a bad connection fails fast instead
  // of hanging indefinitely.
  max: 10,
  connectionTimeoutMillis: 10_000,
});

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

module.exports = prisma;
