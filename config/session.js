const session = require("express-session");
const MongoStore = require("connect-mongo");

const isProd = process.env.NODE_ENV === "production";

const sessionConfig = session({
  name: "lh.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,

  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
  }),

  cookie: {
    httpOnly: true,
    // "lax" stops other sites from sending authenticated POSTs on the user's behalf.
    sameSite: "lax",
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 24 * 14,
  },
});

module.exports = sessionConfig;
