const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const prisma = require("../db/prismaClient");

// JWT strategy — the only one in use. Login/register do password checking
// directly in authController (via db/userQueries.js) rather than through a
// passport-local strategy, since that flow also needs to issue and store a
// refresh token as part of the same request, which doesn't map cleanly onto
// passport's authenticate() callback shape.
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;
