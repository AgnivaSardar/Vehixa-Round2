const express = require("express");
const cors = require("cors");
const { env } = require("./config/env");
const { apiRouter } = require("./routes");

const app = express();

/* ---------------- CORS ---------------- */

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://vehicle-telemetry-round2.vercel.app",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

/* ------------- Middleware ------------ */

app.use(express.json());

/* ------------- Health Check ---------- */

app.get("/health", (_req, res) => {
  res.status(200).json({
    app: "round2-backend",
    status: "ok",
    time: new Date().toISOString(),
  });
});

/* ------------- API Routes ------------ */

app.use(env.API_PREFIX, apiRouter);

/* ------------- 404 Handler ----------- */

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* ----------- Error Handler ----------- */

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message =
    statusCode >= 500 ? "Internal server error" : error.message;

  if (statusCode >= 500) {
    console.error("[error]", error);
  }

  res.status(statusCode).json({ message });
});

module.exports = { app };