require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const multer = require("multer");

const connectDb = require("./db/database");
const sessionConfig = require("./config/session");
const passport = require("./config/passport");
const limits = require("./middlewares/rate-limits");
const authRoutes = require("./routes/auth-routes");
const apiRoutes = require("./routes/api-routes");

const app = express();

// Behind Cloudflare / a reverse proxy: trust the first hop so req.ip and secure cookies work.
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://lh3.googleusercontent.com"],
        connectSrc: ["'self'", "https://nominatim.openstreetmap.org"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);

app.use(express.json({ limit: "100kb" }));
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/auth", limits.auth, authRoutes);
app.use("/api", limits.api, apiRoutes);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// The React app (built with `npm run build`). Any other GET gets index.html.
const clientDist = path.join(__dirname, "client", "dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError || error.message === "Only image files are allowed") {
    return res.status(400).json({ error: error.message });
  }

  console.error(error);
  res.status(500).json({ error: "Something went wrong" });
});

const port = process.env.PORT || 3000;

connectDb().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on Port ${port}`);
  });
});
