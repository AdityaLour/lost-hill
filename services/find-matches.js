const FoundItem = require("../models/found-schema");
const Match = require("../models/match-schema");
const { rank } = require("./scoring");
const { verifyPair } = require("./ai/verify");

const SEARCH_RADIUS_METERS = 40000;
const SHOW_AT_LEAST = 55; // ranking score below this is not shown
const MAX_RESULTS = 6;
const MAX_VERIFIED = 3; // the only AI calls a lookup can start
const DROP_IF_TEXT_BELOW = 30; // the verifier says these are clearly different objects

function blend(rankScore, verified) {
  if (!verified) return rankScore;

  const parts = [verified.textScore, verified.imageScore].filter((value) => value !== null);
  const verifier = parts.reduce((sum, value) => sum + value, 0) / parts.length;

  return Math.round(rankScore * 0.5 + verifier * 0.5);
}

async function findMatches(lostItem) {
  const nearby = await FoundItem.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: lostItem.location.coordinates },
        distanceField: "distance",
        maxDistance: SEARCH_RADIUS_METERS,
        spherical: true,
        query: { status: "open", user: { $ne: lostItem.user } },
      },
    },
    { $limit: 150 },
  ]);

  const ranked = rank(lostItem, nearby)
    .filter((entry) => entry.score >= SHOW_AT_LEAST)
    .slice(0, MAX_RESULTS);

  const cached = await Match.find({
    lostItem: lostItem._id,
    foundItem: { $in: ranked.map((entry) => entry.found._id) },
  });
  const cachedById = new Map(cached.map((match) => [String(match.foundItem), match]));

  // Only the top few uncached pairs may use the AI verifier.
  const toVerify = ranked.filter((entry) => !cachedById.has(String(entry.found._id))).slice(0, MAX_VERIFIED);

  await Promise.all(
    toVerify.map(async (entry) => {
      const verified = await verifyPair(lostItem, entry.found);

      // Only remember real answers, so an outage or a spent budget does not stick.
      if (!verified) return;

      const match = await Match.create({
        lostItem: lostItem._id,
        foundItem: entry.found._id,
        semanticScore: verified.textScore,
        imageScore: verified.imageScore,
        semanticReason: verified.reason,
        verifyProvider: verified.provider,
      });

      cachedById.set(String(entry.found._id), match);
    }),
  );

  const results = [];

  for (const entry of ranked) {
    const match = cachedById.get(String(entry.found._id));
    const verified = match
      ? { textScore: match.semanticScore, imageScore: match.imageScore, reason: match.semanticReason }
      : null;

    if (verified && verified.textScore < DROP_IF_TEXT_BELOW) continue;

    results.push({
      found: entry.found,
      distanceMeters: Math.round(entry.distance),
      matchPercentage: blend(entry.score, verified),
      reason: verified ? verified.reason : null,
      aiChecked: Boolean(verified),
    });
  }

  return results.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

module.exports = findMatches;
