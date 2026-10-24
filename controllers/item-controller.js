const mongoose = require("mongoose");

const cloudinary = require("../config/cloudinary");
const LostItem = require("../models/lost-schema");
const FoundItem = require("../models/found-schema");
const Claim = require("../models/claim-schema");
const findMatches = require("../services/find-matches");
const embedReport = require("../services/embed-report");

const MODELS = { lost: LostItem, found: FoundItem };
const CATEGORIES = ["Wallet", "Phone", "Keys", "Bag", "Laptop", "Watch", "Documents", "Other"];
const SOURCES = ["gps", "search", "pin"];

const firstName = (name) => (name ? name.trim().split(/\s+/)[0] : "Someone");
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// What the public (and other users) may see about an item. Never contact details.
function present(item, type) {
  const o = item.toObject ? item.toObject() : item;
  const poster = o.user && o.user.name ? o.user : null;

  return {
    id: String(o._id),
    type,
    category: o.description.category,
    details: o.description.details,
    date: o.description.lostDate,
    address: o.location.address,
    // [longitude, latitude]
    coordinates: o.location.coordinates,
    images: o.images,
    status: o.status,
    createdAt: o.createdAt,
    poster: poster ? { name: firstName(poster.name), avatar: poster.avatar } : null,
  };
}

function modelFor(type) {
  return MODELS[type] || null;
}

async function listItems(req, res) {
  const type = MODELS[req.query.type] ? req.query.type : "all";
  const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 48);
  const filter = { status: "open" };

  if (CATEGORIES.includes(req.query.category)) {
    filter["description.category"] = req.query.category;
  }

  if (typeof req.query.q === "string" && req.query.q.trim()) {
    const pattern = new RegExp(escapeRegex(req.query.q.trim().slice(0, 60)), "i");
    filter.$or = [{ "description.details": pattern }, { "location.address": pattern }];
  }

  if (req.query.near) {
    const [lat, lng] = String(req.query.near).split(",").map(Number);
    const radiusKm = Math.min(Math.max(Number(req.query.radiusKm) || 25, 1), 200);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      filter.location = { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6378.1] } };
    }
  }

  if (req.query.before && !Number.isNaN(Date.parse(req.query.before))) {
    filter.createdAt = { $lt: new Date(req.query.before) };
  }

  const types = type === "all" ? ["found", "lost"] : [type];

  const lists = await Promise.all(
    types.map(async (t) => {
      const docs = await MODELS[t]
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("user", "name avatar");
      return docs.map((doc) => present(doc, t));
    }),
  );

  const items = lists
    .flat()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

  res.json({ items });
}

async function createItem(req, res) {
  const Model = modelFor(req.params.type);

  if (!Model) {
    return res.status(404).json({ error: "Unknown item type" });
  }

  const { lat, lng, address, source, category, details, date } = req.body;
  const latitude = Number(lat);
  const longitude = Number(lng);
  const when = new Date(date);

  const problems = [];

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) problems.push("location");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) problems.push("location");
  if (!address || !String(address).trim()) problems.push("address");
  if (!CATEGORIES.includes(category)) problems.push("category");
  if (!details || String(details).trim().length < 10 || String(details).length > 1000) {
    problems.push("details");
  }
  if (Number.isNaN(when.getTime()) || when > new Date()) problems.push("date");
  if (when < new Date(Date.now() - 1000 * 60 * 60 * 24 * 365)) problems.push("date");

  const files = req.files || [];

  if (req.params.type === "found" && files.length === 0) {
    problems.push("photo");
  }

  if (problems.length) {
    return res.status(400).json({
      error: `Check these fields: ${[...new Set(problems)].join(", ")}`,
      fields: [...new Set(problems)],
    });
  }

  const uploads = await Promise.all(
    files.map((file) =>
      cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        { folder: `${req.params.type}-items` },
      ),
    ),
  );

  const item = await Model.create({
    user: req.user.id,
    location: {
      type: "Point",
      coordinates: [longitude, latitude],
      address: String(address).trim().slice(0, 200),
      source: SOURCES.includes(source) ? source : "pin",
    },
    description: {
      category,
      details: String(details).trim(),
      lostDate: when,
    },
    images: uploads.map((upload) => upload.secure_url),
  });

  // Compute match vectors in the background. The poster should not wait for an AI service.
  embedReport(Model, item).catch((error) => console.error("Embedding failed:", error.message));

  res.status(201).json({ item: present(item, req.params.type) });
}

async function getItem(req, res) {
  const { type, id } = req.params;
  const Model = modelFor(type);

  if (!Model || !mongoose.isValidObjectId(id)) {
    return res.status(404).json({ error: "Not found" });
  }

  const item = await Model.findById(id).populate("user", "name avatar");

  if (!item) {
    return res.status(404).json({ error: "Not found" });
  }

  const isOwner = Boolean(req.user) && String(item.user._id) === String(req.user.id);
  const result = { ...present(item, type), isOwner };

  if (type === "found" && req.user) {
    if (isOwner) {
      result.pendingClaims = await Claim.countDocuments({ foundItem: id, status: "pending" });
    } else {
      const mine = await Claim.findOne({ foundItem: id, claimant: req.user.id }).select(
        "status message",
      );
      result.myClaim = mine ? { id: String(mine._id), status: mine.status } : null;
    }
  }

  res.json({ item: result });
}

async function getMatches(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Not found" });
  }

  const lostItem = await LostItem.findById(req.params.id).select("+embedding");

  if (!lostItem) {
    return res.status(404).json({ error: "Not found" });
  }

  if (String(lostItem.user) !== String(req.user.id)) {
    return res.status(403).json({ error: "Only the person who posted this can see matches" });
  }

  // Reports posted while embeddings were off or failing get their vectors on first lookup.
  if (!lostItem.embedding || !lostItem.embedding.text || lostItem.embedding.text.length === 0) {
    const embedding = await embedReport(LostItem, lostItem).catch(() => null);
    if (embedding) lostItem.embedding = embedding;
  }

  const matches = await findMatches(lostItem);

  res.json({
    matches: matches.map((match) => ({
      item: present(match.found, "found"),
      matchPercentage: match.matchPercentage,
      distanceMeters: match.distanceMeters,
      reason: match.reason,
      aiChecked: match.aiChecked,
    })),
  });
}

module.exports = { listItems, createItem, getItem, getMatches, present, CATEGORIES };
