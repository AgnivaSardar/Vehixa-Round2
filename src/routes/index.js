const express = require("express");
const { telemetryRouter } = require("../modules/telemetry/telemetry.routes");
const { vehicleRouter } = require("../modules/vehicle/vehicle.routes");
const { alertRouter } = require("../modules/alert/alert.routes");

const apiRouter = express.Router();

apiRouter.use("/telemetry", telemetryRouter);
apiRouter.use("/vehicles", vehicleRouter);
apiRouter.use("/alerts", alertRouter);

module.exports = { apiRouter };
