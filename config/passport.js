const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

const User = require("../models/user-schema");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
      // Needed behind Cloudflare / a reverse proxy so the callback uses https.
      proxy: true,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;

        if (!email) {
          return done(new Error("Google account has no email"));
        }

        const user = await User.findOneAndUpdate(
          { googleId: profile.id },
          {
            $set: {
              email,
              name: profile.displayName || email.split("@")[0],
              avatar: profile.photos && profile.photos[0] && profile.photos[0].value,
            },
          },
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
        );

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
