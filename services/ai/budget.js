const AiUsage = require("../../models/ai-usage-schema");

const DEFAULT_CAPS = { verify: 300, embed: 1500 };

function capFor(kind) {
  const fromEnv = Number(process.env[`AI_DAILY_CAP_${kind.toUpperCase()}`]);
  return Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : DEFAULT_CAPS[kind];
}

const today = () => new Date().toISOString().slice(0, 10);

// Reserve one AI call for today. Returns false once the daily cap is reached, so the
// caller skips the AI step and falls back to the cheap ranking instead of failing.
async function consume(kind) {
  if (process.env.AI_BUDGET_OFF === "1") return true;
  const cap = capFor(kind);
  if (cap <= 0) return false;
  const field = `calls.${kind}`;

  try {
    const doc = await AiUsage.findOneAndUpdate(
      { day: today(), $or: [{ [field]: { $lt: cap } }, { [field]: { $exists: false } }] },
      { $inc: { [field]: 1 } },
      { upsert: true, returnDocument: "after" },
    );

    return doc.calls.get(kind) <= cap;
  } catch (error) {
    // Duplicate key: today's document exists but its counter is already at the cap.
    if (error.code === 11000) return false;

    console.error("AI budget check failed:", error.message);
    return false;
  }
}

module.exports = { consume, capFor };
