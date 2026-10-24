// Ranking without any AI call. Every signal is scored 0..100, then combined with weights
// that are renormalised over the signals we actually have for a pair.
//
// The RANGES below turn raw cosine similarity into 0..100. They are STARTING VALUES taken
// from typical behaviour of these models, not measured on Lost Hill data. Run
// `npm run eval` with a few labelled pairs and adjust them.

const RANGES = {
  text: [0.35, 0.85],
  image: [0.55, 0.92],
  cross: [0.12, 0.34], // text of one report against the photo of the other
};

const WEIGHTS = {
  text: 0.35,
  image: 0.3,
  cross: 0.15,
  proximity: 0.1,
  category: 0.05,
  date: 0.05,
  words: 0.35, // used instead of "text" when there are no text vectors
};

function cosine(a, b) {
  if (!a || !b || a.length === 0 || a.length !== b.length) return null;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return null;

  return dot / Math.sqrt(normA * normB);
}

function rescale(value, [low, high]) {
  if (value === null) return null;
  return Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));
}

function proximityScore(meters) {
  if (meters <= 2000) return 100;
  if (meters <= 5000) return 80;
  if (meters <= 10000) return 60;
  if (meters <= 20000) return 35;
  return 10;
}

function dateScore(lostDate, foundDate) {
  const days = (new Date(foundDate) - new Date(lostDate)) / (1000 * 60 * 60 * 24);

  if (days < -1) return 0; // found before it was lost: not this item
  if (days <= 1) return 100;
  if (days <= 3) return 80;
  if (days <= 7) return 50;
  if (days <= 30) return 20;
  return 0;
}

function categoryScore(a, b) {
  if (a === b) return 100;
  if (a === "Other" || b === "Other") return 50;
  return 0;
}

const FILLER = new Set(["with", "that", "this", "from", "have", "near", "found", "lost", "inside", "some", "very", "there", "their", "also"]);

const wordsOf = (text) =>
  new Set((text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []).filter((word) => !FILLER.has(word)));

function wordOverlap(a, b) {
  const wordsA = wordsOf(a);
  const wordsB = wordsOf(b);
  let shared = 0;

  for (const word of wordsA) if (wordsB.has(word)) shared += 1;

  return Math.min(100, shared * 25);
}

function sameModel(a, b) {
  return a && b && a.model && a.model === b.model;
}

// Returns { score, signals } where signals lists each 0..100 value that was available.
function scorePair(lost, found, distanceMeters) {
  const signals = {
    proximity: proximityScore(distanceMeters),
    category: categoryScore(lost.description.category, found.description.category),
    date: dateScore(lost.description.lostDate, found.description.lostDate),
  };

  const lostEmbedding = lost.embedding;
  const foundEmbedding = found.embedding;

  if (sameModel(lostEmbedding, foundEmbedding)) {
    signals.text = rescale(cosine(lostEmbedding.text, foundEmbedding.text), RANGES.text);

    const imageToImage = cosine(lostEmbedding.image, foundEmbedding.image);

    if (imageToImage !== null) {
      signals.image = rescale(imageToImage, RANGES.image);
    } else {
      // One side has no photo: compare the description with the other side's photo.
      const cross = cosine(lostEmbedding.text, foundEmbedding.image) ?? cosine(foundEmbedding.text, lostEmbedding.image);
      if (cross !== null) signals.cross = rescale(cross, RANGES.cross);
    }
  }

  if (signals.text === undefined || signals.text === null) {
    delete signals.text;
    signals.words = wordOverlap(lost.description.details, found.description.details);
  }

  let total = 0;
  let weight = 0;

  for (const [name, value] of Object.entries(signals)) {
    if (value === null || value === undefined) continue;
    total += WEIGHTS[name] * value;
    weight += WEIGHTS[name];
  }

  return { score: Math.round(total / weight), signals };
}

// candidates: plain documents with a numeric `distance` (metres), as returned by $geoNear.
function rank(lost, candidates) {
  return candidates
    .map((found) => ({ found, distance: found.distance, ...scorePair(lost, found, found.distance) }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { cosine, rescale, proximityScore, dateScore, categoryScore, wordOverlap, scorePair, rank, RANGES, WEIGHTS };
