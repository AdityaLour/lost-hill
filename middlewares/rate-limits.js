const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Signed-in users are limited by account, everyone else by IP.
const keyByUser = (req) => (req.user ? `u:${req.user.id}` : ipKeyGenerator(req.ip));

function make({ windowMs, limit, message, key = keyByUser }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: key,
    handler: (_req, res) => res.status(429).json({ error: message, code: "RATE_LIMITED" }),
  });
}

module.exports = {
  // Everything under /api, per IP.
  api: make({
    windowMs: 15 * MINUTE,
    limit: 300,
    message: "Too many requests. Try again in a few minutes.",
    key: (req) => ipKeyGenerator(req.ip),
  }),

  // Sign-in attempts, per IP.
  auth: make({
    windowMs: 15 * MINUTE,
    limit: 30,
    message: "Too many sign-in attempts. Try again later.",
    key: (req) => ipKeyGenerator(req.ip),
  }),

  // Posting a lost or found report, per user. This is what keeps user counts and storage in check.
  post: make({
    windowMs: DAY,
    limit: 10,
    message: "You can post 10 reports a day. Try again tomorrow.",
  }),

  // Sending claims, per user.
  claim: make({
    windowMs: DAY,
    limit: 15,
    message: "You have sent a lot of claims today. Try again tomorrow.",
  }),

  // Match lookups call Gemini, per user.
  match: make({
    windowMs: HOUR,
    limit: 12,
    message: "Match lookups are limited to 12 an hour. Try again later.",
  }),
};
