const express = require("express");

const upload = require("../middlewares/upload");
const requireAuth = require("../middlewares/auth");
const limits = require("../middlewares/rate-limits");

const { listItems, createItem, getItem, getMatches } = require("../controllers/item-controller");
const { getMe, updateMe, myItems, logout } = require("../controllers/me-controller");
const { createClaim, listClaims, decideClaim } = require("../controllers/claim-controller");

const router = express.Router();

router.get("/me", getMe);
router.patch("/me", requireAuth, updateMe);
router.get("/me/items", requireAuth, myItems);
router.post("/logout", logout);

router.get("/items", listItems);
router.post("/items/:type", requireAuth, limits.post, upload.array("images", 3), createItem);
router.get("/items/:type/:id", getItem);
router.get("/items/lost/:id/matches", requireAuth, limits.match, getMatches);

router.post("/items/found/:id/claims", requireAuth, limits.claim, createClaim);
router.get("/claims", requireAuth, listClaims);
router.patch("/claims/:id", requireAuth, decideClaim);

module.exports = router;
