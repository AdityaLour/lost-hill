# Lost Hill — AI-Powered Lost & Found Platform

Lost Hill is a full-stack lost-and-found application that goes beyond keyword search — it uses embeddings and a light AI check to automatically surface likely matches between lost and found item reports.

**Live:** [losthill.online](https://losthill.online)

## Features

- **Semantic + Image Matching** — Every report is embedded once when it is posted. Lookups rank candidates by stored vectors, distance, date and category with no AI call; only the top 3 are checked by one vision-model call each.
- **Weighted Scoring Engine** — A dynamic, priority-redistributing scoring algorithm ranks potential matches by combining multiple signals (description similarity, image similarity, location, time) instead of relying on a single fixed metric.
- **Two-Tier Confidence Banding** — Matches are classified into confidence tiers (e.g., high-confidence vs. possible match), so users see the most likely matches first without being overwhelmed by weak ones.
- **Privacy-Scoped Result Visibility** — Match details are only revealed to relevant users, protecting reporter privacy until a match is confirmed.

## Tech Stack

- **Frontend:** React + Vite (`client/`), plain CSS, self-hosted fonts
- **Backend:** Node.js, Express 5, Passport (Google sign-in), express-rate-limit, helmet
- **Database:** MongoDB (Mongoose), sessions in MongoDB
- **AI/Matching:** Jina CLIP v2 or Cloudflare bge-m3 (embeddings), Mistral and/or Gemini (verification)
- **Photos:** Cloudinary

## How It Works

1. Sign in with Google. No passwords, no SMS.
2. Post a lost or found report: category, description, date, place, photos (required for found items).
3. Lost reports are matched against open found reports within 40 km (see Matching).
4. An owner sends a claim describing something only they would know.
5. The finder approves or declines. Only on approval do the two people see each other's phone number.

The phone number is an unverified profile field. It is never shown on reports or to anyone before a claim is approved.

## Matching

1. **Post time:** one embedding call per report (text, plus the first photo with Jina). Stored on the report.
2. **Lookup:** found reports within 40 km are ranked locally from cosine similarity (description, photo, description-against-photo), distance, date and category. If a report has no vectors, word overlap is used instead. No AI call.
3. **Verify:** the top 3 uncached pairs get one combined call (both descriptions and both photos) that returns `{textScore, imageScore, reason}` as JSON. The final score is half ranking, half verifier. A verified pair with a text score under 30 is dropped. Results are cached in `Match`.
4. **Budget:** a global daily cap (`AI_DAILY_CAP_VERIFY`, `AI_DAILY_CAP_EMBED`) stops all AI calls when reached. Matching then falls back to the local ranking, so the site keeps working.

Safety: user text goes into prompts only as delimited, length-capped data that the model is told to treat as untrusted; model output is parsed as JSON and clamped to 0-100; photos are fetched only from `res.cloudinary.com`; photos of the "Documents" category are never sent to an outside service.

Everything is optional: with no AI keys the ranking still works from word overlap, distance, date and category.

```bash
npm test               # unit tests, no network or database needed
npm run eval           # score labelled pairs in eval/pairs.json, to tune services/scoring.js
npm run backfill       # embed reports posted before embeddings were enabled
```

The score ranges in `services/scoring.js` are starting values, not measured on real data. Add real labelled pairs to `eval/pairs.json` and run `npm run eval` with your embedding key before trusting the percentages.

## Rate limits

Per IP: 300 API requests / 15 min, 30 sign-in attempts / 15 min.
Per user: 10 posts / day, 15 claims / day, 12 match lookups / hour. A lookup starts at most 3 AI checks; results are cached per pair.

## Getting Started

```bash
git clone https://github.com/AdityaLour/lost-hill.git
cd lost-hill
cp .env.example .env        # fill it in
npm install
npm --prefix client install
npm run dev                 # API on :3000, app on http://localhost:5173
```

Production: `npm run build && NODE_ENV=production npm start`. Express serves `client/dist`.

Google OAuth: create a "Web application" client and add the redirect URI from `.env.example`.
Behind Cloudflare or another proxy the app already trusts the first proxy hop.

## Author

Built by [Aditya Lour](https://github.com/AdityaLour).
