const { app } = require("./app");
const { env } = require("./config/env");
const { prisma } = require("./config/db");

const server = app.listen(env.PORT, () => {
  console.log(`round2-backend running on http://localhost:${env.PORT}${env.API_PREFIX}/telemetry`);
});

const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down round2-backend...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
