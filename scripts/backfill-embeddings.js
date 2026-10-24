// Computes vectors for reports that do not have them yet (posted before this feature, or
// while the embedding service was down). Respects the daily embedding budget.
//   npm run backfill
require("dotenv").config();

const mongoose = require("mongoose");

const LostItem = require("../models/lost-schema");
const FoundItem = require("../models/found-schema");
const embedReport = require("../services/embed-report");
const { provider } = require("../services/ai/embeddings");

async function main() {
  if (!provider()) {
    console.log("No embedding provider configured. Set JINA_API_KEY or CLOUDFLARE_* in .env.");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);

  let done = 0;
  let skipped = 0;

  for (const Model of [FoundItem, LostItem]) {
    const items = await Model.find({
      status: "open",
      $or: [{ "embedding.model": { $exists: false } }, { "embedding.model": null }],
    });

    for (const item of items) {
      const embedding = await embedReport(Model, item);

      if (embedding) done += 1;
      else skipped += 1;

      // Be gentle with free-tier rate limits.
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }

  console.log(`Embedded ${done}. Skipped ${skipped} (budget reached, Documents photo, or error).`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
