const express = require("express");
const driverService = require("./driver.service");

const driverRouter = express.Router();

/**
 * @route   GET /api/drivers
 * @desc    Get all driver profiles
 * @access  Public
 */
driverRouter.get("/", async (req, res) => {
  try {
    const drivers = await driverService.getAllDrivers();
    res.json({
      success: true,
      data: drivers,
    });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch drivers",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/drivers/stats
 * @desc    Get driver statistics
 * @access  Public
 */
driverRouter.get("/stats", async (req, res) => {
  try {
    const stats = await driverService.getDriverStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching driver stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch driver stats",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/drivers/:userId
 * @desc    Get a specific driver profile
 * @access  Public
 */
driverRouter.get("/:userId", async (req, res) => {
  try {
    const driver = await driverService.getDriverProfile(req.params.userId);
    res.json({
      success: true,
      data: driver,
    });
  } catch (error) {
    console.error("Error fetching driver profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch driver profile",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/drivers
 * @desc    Create or update a driver profile
 * @access  Public
 */
driverRouter.post("/", async (req, res) => {
  try {
    const profile = await driverService.upsertDriverProfile(req.body);
    res.status(201).json({
      success: true,
      message: "Driver profile saved successfully",
      data: profile,
    });
  } catch (error) {
    console.error("Error saving driver profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save driver profile",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/drivers/:userId/status
 * @desc    Update driver status
 * @access  Public
 */
driverRouter.put("/:userId/status", async (req, res) => {
  try {
    const updated = await driverService.updateDriverStatus(
      req.params.userId,
      req.body.status
    );
    res.json({
      success: true,
      message: "Driver status updated",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating driver status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update driver status",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/drivers/:userId/vehicle
 * @desc    Assign a vehicle to a driver
 * @access  Public
 */
driverRouter.put("/:userId/vehicle", async (req, res) => {
  try {
    const updated = await driverService.assignVehicle(
      req.params.userId,
      req.body.vehicleId
    );
    res.json({
      success: true,
      message: "Vehicle assigned to driver",
      data: updated,
    });
  } catch (error) {
    console.error("Error assigning vehicle:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign vehicle",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/drivers/:userId/trips
 * @desc    Get trips for a specific driver
 * @access  Public
 */
driverRouter.get("/:userId/trips", async (req, res) => {
  try {
    const trips = await driverService.getDriverTrips(req.params.userId);
    res.json({
      success: true,
      data: trips,
    });
  } catch (error) {
    console.error("Error fetching driver trips:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch driver trips",
      error: error.message,
    });
  }
});

module.exports = { driverRouter };
