const express = require("express");
const { env } = require("./config/env");
const { apiRouter } = require("./routes");

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    app: "round2-backend",
    status: "ok",
    time: new Date().toISOString(),
  });
});

app.use(env.API_PREFIX, apiRouter);

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = statusCode >= 500 ? "Internal server error" : error.message;

  if (statusCode >= 500) {
    console.error("[error]", error);
  }

  res.status(statusCode).json({ message });
});

module.exports = { app };
