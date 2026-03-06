const express = require("express");
const { alertService } = require("./alert.service");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const alerts = await alertService.list({
      vehicleId: req.query.vehicleId,
      severity: req.query.severity,
      isResolved: req.query.isResolved,
      limit: req.query.limit,
    });

    res.status(200).json({
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const stats = await alertService.getStats();
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
});

router.get("/:alertId", async (req, res, next) => {
  try {
    const alert = await alertService.getById(req.params.alertId);

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.status(200).json({ alert });
  } catch (error) {
    next(error);
  }
});

router.patch("/:alertId/acknowledge", async (req, res, next) => {
  try {
    const alert = await alertService.acknowledge(req.params.alertId);
    
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.status(200).json({
      message: "Alert acknowledged",
      alert,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { alertRouter: router };
