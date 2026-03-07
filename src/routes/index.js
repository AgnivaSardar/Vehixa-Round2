const express = require("express");
const { telemetryRouter } = require("../modules/telemetry/telemetry.routes");
const { vehicleRouter } = require("../modules/vehicle/vehicle.routes");
const { alertRouter } = require("../modules/alert/alert.routes");
const { healthRouter } = require("../modules/health/health.routes");
const { insuranceRouter } = require("../modules/insurance/insurance.routes");
const { dispatchRouter } = require("../modules/dispatch/dispatch.routes");
const { maintenanceRouter } = require("../modules/maintenance/maintenance.routes");
const { driverRouter } = require("../modules/driver/driver.routes");
const { supportRouter } = require("../modules/support/support.routes");

const apiRouter = express.Router();

apiRouter.use("/telemetry", telemetryRouter);
apiRouter.use("/vehicles", vehicleRouter);
apiRouter.use("/alerts", alertRouter);
apiRouter.use("/health-predictions", healthRouter);
apiRouter.use("/insurance", insuranceRouter);
apiRouter.use("/dispatch", dispatchRouter);
apiRouter.use("/maintenance", maintenanceRouter);
apiRouter.use("/drivers", driverRouter);
apiRouter.use("/support", supportRouter);

module.exports = { apiRouter };
