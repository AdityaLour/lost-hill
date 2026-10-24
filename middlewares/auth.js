function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Sign in to continue", code: "AUTH_REQUIRED" });
  }

  next();
}

module.exports = requireAuth;
