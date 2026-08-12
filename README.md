# Ringside API

Express + Prisma 7 + PostgreSQL backend for the Ringside frontend.
This repo includes JWT auth, rotating refresh tokens, secure password
handling with bcrypt, and email-based password reset support.

## Overview

- `app.js` starts the Express server and mounts routes under `/api`
- `db/prismaClient.js` creates a Prisma client configured for Postgres
- `controller/` contains request handlers for auth, users, events, fights,
  and scorecards
- `middleware/` contains auth, validation, error handling, and rate limiting
- `prisma/schema.prisma` defines the data model
- `prisma/seed.js` creates demo data and the seeded organizer account

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example` or create it manually.

3. Set required environment variables.

4. Generate the Prisma client:

   ```bash
   npx prisma generate
   ```

5. Run migrations:

   ```bash
   npx prisma migrate dev --name init
   ```

6. Seed the database:

   ```bash
   npx prisma db seed
   ```

7. Start the app:

   ```bash
   npm run dev
   ```

8. Visit `http://localhost:4000` and verify `GET /health`.

## Required environment variables

- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET` — JWT access token signing secret
- `JWT_REFRESH_SECRET` — JWT refresh token signing secret
- `RESEND_API_KEY` — Resend API service key for password reset emails
- `EMAIL_FROM` — email sender address used by password reset emails
- `ORGANIZER_PW` — seeded organizer password for `prisma db seed`

Optional:

- `CLIENT_ORIGIN` — frontend origin for CORS (default: `http://localhost:5173`)
- `PORT` — server port (default: `4000`)
- `NODE_ENV` — application environment

> Do not commit `.env` to source control.

## Seeded account

The demo organizer is created by `prisma/seed.js` with:

- email: `organizer@ringside.app`
- password: the value of `ORGANIZER_PW`

## Project structure

```text
controller/     # request handling and route handlers
db/
  prismaClient.js  # singleton Prisma client configured for Postgres
  userQueries.js   # user lookup and refresh token storage logic
generated/
  prisma/           # generated Prisma client output (gitignored)
middleware/
  passport.js      # passport-jwt strategy configuration
  requireAuth.js   # JWT-protected route helper
  requireRole.js    # role-based authorization helper
  validate.js      # express-validator helper
  errorHandler.js  # centralized error handler
  asyncHandler.js  # async route wrapper
  rateLimiter.js   # rate limiting middleware
prisma/
  schema.prisma    # database schema model
  seed.js          # demo seed data for organizer, events, fights
prisma.config.js   # Prisma CLI config and datasource settings
public/            # static assets
routes/            # API route definitions
app.js             # Express application entry point
```

## API endpoints

| Method | Route                          | Auth              | Notes |
|--------|--------------------------------|-------------------|-------|
| POST   | `/api/auth/register`           | —                 | rate-limited |
| POST   | `/api/auth/login`              | —                 | rate-limited |
| POST   | `/api/auth/refresh`            | —                 | rotates refresh token |
| POST   | `/api/auth/logout`             | —                 | revokes stored refresh token |
| GET    | `/api/auth/me`                 | required          | |
| GET    | `/api/events`                  | —                 | |
| GET    | `/api/events/:id`              | —                 | |
| POST   | `/api/events`                  | organizer/admin   | creates event + main event fight |
| POST   | `/api/events/:id/fights`       | organizer/admin   | adds an undercard fight |
| GET    | `/api/fights/:id`              | —                 | |
| POST   | `/api/scorecards`              | required          | get-or-create for `{ fightId }` |
| PATCH  | `/api/scorecards/:id`          | required, owner   | save round progress |
| POST   | `/api/scorecards/:id/finalize` | required, owner   | finalize scorecard |
| GET    | `/api/scorecards/mine`         | required          | |
| GET    | `/api/users/me/accuracy`       | required          | |

## Prisma notes

This project uses Prisma 7 with the driver-adapter architecture:

- `prisma.config.js` contains CLI config and reads `DATABASE_URL`
- runtime database access is configured in `db/prismaClient.js`
- generated Prisma client output is stored in `generated/prisma/` and is
  gitignored

## Troubleshooting

- If you see `Cannot read properties of undefined (reading 'findMany')`,
  run:

  ```bash
  npx prisma generate
  ```

- If seeding fails because `ORGANIZER_PW` is missing, set it in `.env` and
  rerun `npx prisma db seed`.

## Notes for developers

- Refresh tokens are stored hashed and rotated on every use.
- Protected routes use `passport-jwt`.
- `express-validator` validates incoming request bodies.
- Rate limiting protects auth endpoints from abuse.

## Production guidance

- Do not deploy with demo credentials in `.env`.
- Rotate secrets if `.env` is accidentally committed.
- Add tests and pagination before production use.
- Consider multi-device refresh tokens for multiple simultaneous logins.
