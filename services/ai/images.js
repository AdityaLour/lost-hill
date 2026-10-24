// Photos only ever come from our own Cloudinary uploads. Refuse any other host so a
// forged URL can never make the server fetch something else.
const ALLOWED_HOST = "res.cloudinary.com";
const MAX_BYTES = 5 * 1024 * 1024;

function isOurImage(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === ALLOWED_HOST;
  } catch {
    return false;
  }
}

// ID cards, licences and similar are never sent to outside AI services.
function canShareImages(item) {
  return item.description.category !== "Documents";
}

async function fetchAsInlineData(url) {
  if (!isOurImage(url)) throw new Error("Image host not allowed");

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!response.ok) throw new Error(`Image download failed (${response.status})`);

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length > MAX_BYTES) throw new Error("Image too large");

  const mimeType = (response.headers.get("content-type") || "image/jpeg").split(";")[0];

  return { inlineData: { mimeType, data: buffer.toString("base64") } };
}

module.exports = { isOurImage, canShareImages, fetchAsInlineData };
