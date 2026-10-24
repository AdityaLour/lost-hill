const express = require("express");
const passport = require("../config/passport");

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/?signin=failed" }),
  (_req, res) => res.redirect("/"),
);

module.exports = router;
