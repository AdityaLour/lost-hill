// Helpers for handling text written by strangers and JSON written by models.

// User text goes into prompts as data. Strip anything that could close or fake our
// delimiter tags, and control characters, then cap the length.
function cleanUserText(value, max = 600) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Models sometimes wrap JSON in code fences or add a sentence around it.
function extractJson(text) {
  if (typeof text !== "string") return null;

  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function clampScore(value) {
  if (value === null || value === undefined) return null;

  const number = Number(value);

  if (!Number.isFinite(number)) return null;

  return Math.max(0, Math.min(100, Math.round(number)));
}

module.exports = { cleanUserText, extractJson, clampScore };
