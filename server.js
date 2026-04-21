require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT, 10) || 3001;
const TMDB_BASE = "https://api.themoviedb.org/3";

/** Live Server 등 다른 포트에서 열 때 브라우저가 3001로 API를 호출할 수 있게 허용 */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin)
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

const tmdbRouter = express.Router();

tmdbRouter.get(/.*/, async (req, res) => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "TMDB_API_KEY is not set" });
    return;
  }

  let pathPart = req.path.replace(/^\//, "");
  if (!pathPart || pathPart.includes("..")) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }

  const target = new URL(`${TMDB_BASE}/${pathPart}`);
  const incoming = new URLSearchParams(req.query);
  incoming.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  target.searchParams.set("api_key", apiKey);

  try {
    const upstream = await fetch(target);
    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      res.setHeader("content-type", contentType);
    }
    res.status(upstream.status);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to reach TMDB" });
  }
});

app.use("/api/tmdb", tmdbRouter);

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Open http://localhost:${PORT}`);
  });
}

module.exports = app;
