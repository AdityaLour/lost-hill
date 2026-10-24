// Measures how well the ranking separates true matches from false ones, so RANGES and
// WEIGHTS in services/scoring.js can be tuned on evidence instead of guesses.
//
//   npm run eval                      uses eval/pairs.json
//   npm run eval -- path/to/pairs.json
//
// pairs.json: [{ "label": true, "lost": {...}, "found": {...}, "meters": 800 }, ...]
// Each report: { "category", "details", "date", "image" (optional Cloudinary URL) }.
// With an embedding provider configured this uses real vectors, otherwise word overlap.
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const { scorePair } = require("../services/scoring");
const { embedItem, provider } = require("../services/ai/embeddings");

const THRESHOLD = 30; // matches SHOW_AT_LEAST in find-matches.js

const toReport = (entry) => ({
  description: { category: entry.category, details: entry.details, lostDate: entry.date },
  images: entry.image ? [entry.image] : [],
});

async function main() {
  const file = path.resolve(process.argv[2] || path.join(__dirname, "../eval/pairs.json"));
  const pairs = JSON.parse(fs.readFileSync(file, "utf8"));
  const withVectors = Boolean(provider());

  console.log(`${pairs.length} pairs, ${withVectors ? `vectors from ${provider()}` : "no vectors (word overlap only)"}\n`);

  const rows = [];

  for (const pair of pairs) {
    const lost = toReport(pair.lost);
    const found = toReport(pair.found);

    if (withVectors) {
      lost.embedding = await embedItem(lost);
      found.embedding = await embedItem(found);
    }

    const { score, signals } = scorePair(lost, found, pair.meters ?? 1000);
    rows.push({ label: pair.label, score, signals, note: pair.note || pair.found.details.slice(0, 40) });
  }

  rows.sort((a, b) => b.score - a.score);

  for (const row of rows) {
    const mark = row.label ? "MATCH " : "other ";
    const parts = Object.entries(row.signals).map(([name, value]) => `${name}=${Math.round(value)}`);
    console.log(`${String(row.score).padStart(3)}  ${mark} ${row.note}  [${parts.join(" ")}]`);
  }

  const positives = rows.filter((row) => row.label);
  const negatives = rows.filter((row) => !row.label);
  const caught = positives.filter((row) => row.score >= THRESHOLD).length;
  const leaked = negatives.filter((row) => row.score >= THRESHOLD).length;

  let wins = 0;
  for (const p of positives) for (const n of negatives) if (p.score > n.score) wins += 1;
  const auc = positives.length && negatives.length ? wins / (positives.length * negatives.length) : NaN;

  console.log(`\nAt threshold ${THRESHOLD}: caught ${caught}/${positives.length} true matches, ${leaked}/${negatives.length} false ones still shown.`);
  console.log(`Ranking quality (chance a true match outranks a false one): ${Number.isNaN(auc) ? "n/a" : `${Math.round(auc * 100)}%`}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
