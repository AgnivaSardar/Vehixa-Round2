const express = require("express");
const { telemetryRouter } = require("../modules/telemetry/telemetry.routes");
const { vehicleRouter } = require("../modules/vehicle/vehicle.routes");
const { alertRouter } = require("../modules/alert/alert.routes");
const { healthRouter } = require("../modules/health/health.routes");

const apiRouter = express.Router();

apiRouter.use("/telemetry", telemetryRouter);
apiRouter.use("/vehicles", vehicleRouter);
apiRouter.use("/alerts", alertRouter);
apiRouter.use("/health-predictions", healthRouter);

module.exports = { apiRouter };
