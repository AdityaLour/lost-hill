const User = require("../models/user-schema");
const LostItem = require("../models/lost-schema");
const FoundItem = require("../models/found-schema");
const { present } = require("./item-controller");

const PHONE = /^\+?[0-9][0-9 ()-]{6,17}$/;

function presentMe(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    phoneNumber: user.phoneNumber || "",
  };
}

// Always 200 so the app can tell "signed out" from "server down".
function getMe(req, res) {
  res.json({ user: req.user ? presentMe(req.user) : null });
}

async function updateMe(req, res) {
  const raw = typeof req.body.phoneNumber === "string" ? req.body.phoneNumber.trim() : null;

  if (raw === null) {
    return res.status(400).json({ error: "Send a phoneNumber" });
  }

  if (raw !== "" && !PHONE.test(raw)) {
    return res.status(400).json({ error: "Enter a valid phone number, with country code if abroad" });
  }

  const update = raw === "" ? { $unset: { phoneNumber: 1 } } : { $set: { phoneNumber: raw } };
  const user = await User.findByIdAndUpdate(req.user.id, update, { returnDocument: "after" });

  res.json({ user: presentMe(user) });
}

async function myItems(req, res) {
  const [lost, found] = await Promise.all([
    LostItem.find({ user: req.user.id }).sort({ createdAt: -1 }),
    FoundItem.find({ user: req.user.id }).sort({ createdAt: -1 }),
  ]);

  res.json({
    items: [
      ...lost.map((doc) => present(doc, "lost")),
      ...found.map((doc) => present(doc, "found")),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  });
}

function logout(req, res, next) {
  req.logout((error) => {
    if (error) return next(error);

    req.session.destroy(() => {
      res.clearCookie("lh.sid");
      res.json({ ok: true });
    });
  });
}

module.exports = { getMe, updateMe, myItems, logout };
