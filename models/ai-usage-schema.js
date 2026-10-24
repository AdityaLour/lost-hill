const mongoose = require("mongoose");

// One document per UTC day. "calls" counts how many AI requests were made that day,
// per kind ("verify", "embed"). This is the global spend cap across all users.
const aiUsageSchema = new mongoose.Schema({
  day: { type: String, required: true, unique: true },
  calls: { type: Map, of: Number, default: {} },
});

module.exports = mongoose.model("AiUsage", aiUsageSchema);
