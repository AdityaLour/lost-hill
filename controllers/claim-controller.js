const mongoose = require("mongoose");

const Claim = require("../models/claim-schema");
const FoundItem = require("../models/found-schema");
const LostItem = require("../models/lost-schema");

const firstName = (name) => (name ? name.trim().split(/\s+/)[0] : "Someone");

// A claim as one of its two parties sees it. Phone numbers appear only once
// the finder has approved, and only to those two people.
function presentClaim(claim, viewerId) {
  const isClaimant = String(claim.claimant._id) === String(viewerId);
  const other = isClaimant ? claim.finder : claim.claimant;
  const item = claim.foundItem;

  const result = {
    id: String(claim._id),
    role: isClaimant ? "claimant" : "finder",
    status: claim.status,
    message: claim.message,
    createdAt: claim.createdAt,
    decidedAt: claim.decidedAt,
    item: {
      id: String(item._id),
      category: item.description.category,
      details: item.description.details,
      address: item.location.address,
      image: item.images[0] || null,
    },
    other: { name: firstName(other.name), avatar: other.avatar },
    // The claimant's own lost report this claim is for, when they chose one.
    lost: claim.lostItem
      ? { id: String(claim.lostItem._id), category: claim.lostItem.description.category }
      : null,
  };

  if (claim.status === "approved") {
    result.contact = { name: other.name, phone: other.phoneNumber || null };
  }

  return result;
}

function populateClaim(query) {
  return query
    .populate("claimant", "name avatar phoneNumber")
    .populate("finder", "name avatar phoneNumber")
    .populate("foundItem", "description location images")
    .populate("lostItem", "description");
}

async function createClaim(req, res) {
  const { id } = req.params;
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ error: "Not found" });
  }

  if (message.length < 10 || message.length > 500) {
    return res
      .status(400)
      .json({ error: "Describe something only the owner would know (10 to 500 characters)" });
  }

  const item = await FoundItem.findById(id);

  if (!item || item.status !== "open") {
    return res.status(404).json({ error: "This item is no longer available" });
  }

  if (String(item.user) === String(req.user.id)) {
    return res.status(400).json({ error: "You posted this item" });
  }

  if (!req.user.phoneNumber) {
    return res.status(409).json({
      error: "Add your phone number first. It is shared only if the finder approves your claim.",
      code: "PHONE_REQUIRED",
    });
  }

  let lostItem;

  if (req.body.lostItemId && mongoose.isValidObjectId(req.body.lostItemId)) {
    lostItem = await LostItem.findOne({ _id: req.body.lostItemId, user: req.user.id });
  }

  try {
    const claim = await Claim.create({
      foundItem: item._id,
      lostItem: lostItem ? lostItem._id : undefined,
      claimant: req.user.id,
      finder: item.user,
      message,
    });

    res.status(201).json({ claim: { id: String(claim._id), status: claim.status } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "You already sent a claim for this item" });
    }
    throw error;
  }
}

async function listClaims(req, res) {
  const [made, received] = await Promise.all([
    populateClaim(Claim.find({ claimant: req.user.id }).sort({ createdAt: -1 })),
    populateClaim(Claim.find({ finder: req.user.id }).sort({ createdAt: -1 })),
  ]);

  res.json({
    made: made.map((claim) => presentClaim(claim, req.user.id)),
    received: received.map((claim) => presentClaim(claim, req.user.id)),
  });
}

async function decideClaim(req, res) {
  const { id } = req.params;
  const { action } = req.body;

  if (!mongoose.isValidObjectId(id) || !["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Send action: approve or reject" });
  }

  if (action === "approve" && !req.user.phoneNumber) {
    return res.status(409).json({
      error: "Add your phone number first so the owner can reach you.",
      code: "PHONE_REQUIRED",
    });
  }

  // Atomic: only a still-pending claim on your own item can be decided, once.
  const claim = await Claim.findOneAndUpdate(
    { _id: id, finder: req.user.id, status: "pending" },
    { status: action === "approve" ? "approved" : "rejected", decidedAt: new Date() },
    { returnDocument: "after" },
  );

  if (!claim) {
    return res.status(404).json({ error: "No pending claim found" });
  }

  if (action === "approve") {
    await FoundItem.findByIdAndUpdate(claim.foundItem, { status: "claimed" });
    await Claim.updateMany(
      { foundItem: claim.foundItem, _id: { $ne: claim._id }, status: "pending" },
      { status: "rejected", decidedAt: new Date() },
    );
  }

  const fresh = await populateClaim(Claim.findById(claim._id));

  res.json({ claim: presentClaim(fresh, req.user.id) });
}

module.exports = { createClaim, listClaims, decideClaim };
