const test = require("node:test");
const assert = require("node:assert/strict");

const { cosine, rescale, proximityScore, dateScore, categoryScore, wordOverlap, scorePair, rank } = require("../services/scoring");

const item = (category, details, lostDate, embedding) => ({
  description: { category, details, lostDate },
  embedding,
});

test("cosine handles identical, orthogonal, mismatched and empty vectors", () => {
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(cosine([1, 0], [1, 0, 0]), null);
  assert.equal(cosine([0, 0], [1, 0]), null);
  assert.equal(cosine(undefined, [1]), null);
});

test("rescale clamps to 0..100 and passes null through", () => {
  assert.equal(rescale(0.1, [0.2, 0.6]), 0);
  assert.equal(rescale(0.9, [0.2, 0.6]), 100);
  assert.ok(Math.abs(rescale(0.4, [0.2, 0.6]) - 50) < 1e-9);
  assert.equal(rescale(null, [0.2, 0.6]), null);
});

test("distance, date and category signals", () => {
  assert.equal(proximityScore(500), 100);
  assert.equal(proximityScore(30000), 10);
  assert.equal(dateScore("2026-01-10", "2026-01-10"), 100);
  assert.equal(dateScore("2026-01-10", "2026-01-05"), 0);
  assert.equal(dateScore("2026-01-10", "2026-03-10"), 0);
  assert.equal(categoryScore("Phone", "Phone"), 100);
  assert.equal(categoryScore("Phone", "Other"), 50);
  assert.equal(categoryScore("Phone", "Wallet"), 0);
});

test("wordOverlap ignores short words and caps at 100", () => {
  assert.equal(wordOverlap("a red leather wallet", "black wallet"), 25);
  assert.equal(wordOverlap("black leather wallet cards zipper", "black leather wallet cards zipper"), 100);
  assert.equal(wordOverlap("a wallet with cards", "wallet and cards"), 50); // "with" is filler
});

test("scorePair without embeddings falls back to word overlap and still scores", () => {
  const lost = item("Wallet", "brown leather wallet with cards", "2026-01-10");
  const found = item("Wallet", "brown leather wallet", "2026-01-10");
  const { score, signals } = scorePair(lost, found, 500);

  assert.ok("words" in signals);
  assert.ok(!("text" in signals));
  assert.ok(score > 60, `expected a decent score, got ${score}`);
});

test("scorePair ignores embeddings from different models", () => {
  const lost = item("Phone", "black phone", "2026-01-10", { model: "a", text: [1, 0] });
  const found = item("Phone", "black phone", "2026-01-10", { model: "b", text: [1, 0] });

  assert.ok("words" in scorePair(lost, found, 100).signals);
});

test("scorePair uses text vectors, and cross-modal when only one side has a photo", () => {
  const lost = item("Keys", "silver keys", "2026-01-10", { model: "m", text: [1, 0] });
  const found = item("Keys", "silver keys", "2026-01-10", { model: "m", text: [1, 0], image: [0.9, 0.1] });
  const { signals } = scorePair(lost, found, 100);

  assert.ok("text" in signals);
  assert.ok("cross" in signals);
  assert.ok(!("image" in signals));
});

test("rank puts the better pair first and a different object last", () => {
  const lost = item("Phone", "black iphone with cracked screen", "2026-01-10");
  const good = { ...item("Phone", "black iphone cracked screen", "2026-01-10"), distance: 300 };
  const bad = { ...item("Wallet", "green umbrella", "2026-01-10"), distance: 300 };
  const ranked = rank(lost, [bad, good]);

  assert.equal(ranked[0].found, good);
  assert.ok(ranked[0].score > ranked[1].score);
});
