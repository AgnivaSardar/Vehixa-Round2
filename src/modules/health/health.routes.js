const express = require("express");
const { healthService } = require("./health.service");

const router = express.Router();

router.post("/evaluate", async (req, res, next) => {
  try {
    const vehicleId =
      typeof req.body?.vehicleId === "string" ? req.body.vehicleId.trim() : "";

    if (!vehicleId) {
      return res.status(400).json({ message: "vehicleId is required" });
    }

    const result = await healthService.evaluateLive(vehicleId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const predictions = await healthService.list({
      vehicleId: req.query.vehicleId,
      limit: req.query.limit,
    });

    res.status(200).json({
      count: predictions.length,
      predictions,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:predictionId", async (req, res, next) => {
  try {
    const prediction = await healthService.getById(req.params.predictionId);

    if (!prediction) {
      return res.status(404).json({ message: "Prediction not found" });
    }

    res.status(200).json({ prediction });
  } catch (error) {
    next(error);
  }
});

module.exports = { healthRouter: router };
