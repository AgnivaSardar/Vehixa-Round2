const express = require("express");
const { telemetryRouter } = require("../modules/telemetry/telemetry.routes");

const apiRouter = express.Router();

apiRouter.use("/telemetry", telemetryRouter);

module.exports = { apiRouter };
