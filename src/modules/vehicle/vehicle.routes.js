const express = require("express");
const { vehicleService } = require("./vehicle.service");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const vehicles = await vehicleService.list({
      userId: req.query.userId,
    });

    res.status(200).json({
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:vehicleId", async (req, res, next) => {
  try {
    const vehicle = await vehicleService.getById(req.params.vehicleId);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.status(200).json({ vehicle });
  } catch (error) {
    next(error);
  }
});

module.exports = { vehicleRouter: router };
