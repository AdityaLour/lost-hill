const { embedItem } = require("./ai/embeddings");

// Computes and stores the vectors for one report. Safe to call without waiting: a failure
// only means this report is ranked with the simple word-overlap fallback.
async function embedReport(Model, item) {
  const embedding = await embedItem(item);

  if (embedding) {
    await Model.updateOne({ _id: item._id }, { $set: { embedding } });
  }

  return embedding;
}

module.exports = embedReport;
