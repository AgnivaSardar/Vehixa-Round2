const express = require("express");
const { telemetryService } = require("./telemetry.service");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {

    const result = await telemetryService.ingest(req.body || {});

    console.log(
      `[telemetry] vehicle=${result.telemetry.vehicleId} recordedAt=${result.telemetry.recordedAt.toISOString()} alerts=${result.alertsCreated}`
    );

    res.status(201).json({
      message: "Telemetry received and processed",
      telemetry: result.telemetry,
      metricAlerts: result.metricAlerts,
      systemFault: result.systemFault,
      alertsCreated: result.alertsCreated
    });

  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {

    const telemetryList = await telemetryService.list({
      vehicleId: req.query.vehicleId,
      limit: req.query.limit,
    });

    res.status(200).json({
      count: telemetryList.length,
      telemetry: telemetryList
    });

  } catch (error) {
    next(error);
  }
});

router.get("/latest", async (req, res, next) => {
  try {

    const latest = await telemetryService.latest(req.query.vehicleId);

    if (!latest) {
      return res.status(404).json({ message: "No telemetry found" });
    }

    res.status(200).json({ telemetry: latest });

  } catch (error) {
    next(error);
  }
});

module.exports = { telemetryRouter: router };