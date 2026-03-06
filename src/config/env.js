const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5001),
  API_PREFIX: process.env.API_PREFIX || "/api/v1",
};

module.exports = { env };
