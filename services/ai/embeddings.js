const { consume } = require("./budget");
const { canShareImages, isOurImage } = require("./images");

const TIMEOUT = 20000;

function provider() {
  const chosen = (process.env.EMBEDDING_PROVIDER || "").toLowerCase();

  if (chosen === "none") return null;
  if (chosen === "jina" || chosen === "cloudflare") return chosen;

  // Not set: use whichever one has credentials.
  if (process.env.JINA_API_KEY) return "jina";
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) return "cloudflare";

  return null;
}

// Jina CLIP v2: text and photo land in the same vector space, so a lost-item description
// can be compared with a found-item photo. 256 dimensions keeps documents small.
async function embedWithJina({ text, image }) {
  const input = [{ text }];
  if (image) input.push({ image });

  const response = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "jina-clip-v2",
      dimensions: 256,
      normalized: true,
      embedding_type: "float",
      input,
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });

  if (!response.ok) throw new Error(`Jina embeddings failed (${response.status})`);

  const data = (await response.json()).data;

  return {
    model: "jina-clip-v2-256",
    text: data[0].embedding,
    image: image && data[1] ? data[1].embedding : undefined,
  };
}

// Cloudflare Workers AI bge-m3: multilingual, text only (so no photo embedding).
async function embedWithCloudflare({ text }) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: [text] }),
      signal: AbortSignal.timeout(TIMEOUT),
    },
  );

  if (!response.ok) throw new Error(`Cloudflare embeddings failed (${response.status})`);

  const vector = (await response.json()).result.data[0];

  return { model: "cf-bge-m3", text: vector, image: undefined };
}

// What we embed for a report: category plus the description, never contact details.
function textFor(item) {
  return `${item.description.category}. ${item.description.details}`.slice(0, 800);
}

// Returns { model, text, image? } or null when embeddings are off, over budget, or failing.
async function embedItem(item) {
  const chosen = provider();

  if (!chosen) return null;

  const text = textFor(item);
  const photo = item.images && item.images[0];
  const image = photo && canShareImages(item) && isOurImage(photo) ? photo : null;

  if (!(await consume("embed"))) return null;

  try {
    return chosen === "jina"
      ? await embedWithJina({ text, image })
      : await embedWithCloudflare({ text });
  } catch (error) {
    console.error(error.message);
    return null;
  }
}

module.exports = { embedItem, textFor, provider };
