const express = require("express");
const insuranceService = require("./insurance.service");

const insuranceRouter = express.Router();

/**
 * @route   GET /api/insurance
 * @desc    Get all insurance policies with vehicle data
 * @access  Public (will be protected with auth later)
 */
insuranceRouter.get("/", async (req, res) => {
  try {
    const policies = await insuranceService.getAllPolicies();
    res.json({
      success: true,
      data: policies,
    });
  } catch (error) {
    console.error("Error fetching insurance policies:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch insurance policies",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/insurance/stats
 * @desc    Get insurance KPI statistics
 * @access  Public
 */
insuranceRouter.get("/stats", async (req, res) => {
  try {
    const stats = await insuranceService.getInsuranceStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching insurance stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch insurance stats",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/insurance/urgent
 * @desc    Get policies expiring within 7 days + already expired
 * @access  Public
 */
insuranceRouter.get("/urgent", async (req, res) => {
  try {
    const urgentPolicies = await insuranceService.getUrgentPolicies();
    res.json({
      success: true,
      data: urgentPolicies,
    });
  } catch (error) {
    console.error("Error fetching urgent policies:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch urgent policies",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/insurance/upcoming
 * @desc    Get policies expiring in the next 30 days
 * @access  Public
 */
insuranceRouter.get("/upcoming", async (req, res) => {
  try {
    const upcomingRenewals = await insuranceService.getUpcomingRenewals();
    res.json({
      success: true,
      data: upcomingRenewals,
    });
  } catch (error) {
    console.error("Error fetching upcoming renewals:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming renewals",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/insurance/fleet-view
 * @desc    Get all vehicles with their insurance status
 * @access  Public
 */
insuranceRouter.get("/fleet-view", async (req, res) => {
  try {
    const fleetView = await insuranceService.getFleetInsuranceView();
    res.json({
      success: true,
      data: fleetView,
    });
  } catch (error) {
    console.error("Error fetching fleet insurance view:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fleet insurance view",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/insurance
 * @desc    Add a new insurance policy
 * @access  Public
 */
insuranceRouter.post("/", async (req, res) => {
  try {
    const newPolicy = await insuranceService.addPolicy(req.body);
    res.status(201).json({
      success: true,
      message: "Insurance policy added successfully",
      data: newPolicy,
    });
  } catch (error) {
    console.error("Error adding insurance policy:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add insurance policy",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/insurance/:policyId
 * @desc    Update/renew an insurance policy
 * @access  Public
 */
insuranceRouter.put("/:policyId", async (req, res) => {
  try {
    const updatedPolicy = await insuranceService.updatePolicy(
      req.params.policyId,
      req.body
    );
    res.json({
      success: true,
      message: "Insurance policy updated successfully",
      data: updatedPolicy,
    });
  } catch (error) {
    console.error("Error updating insurance policy:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update insurance policy",
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/insurance/:policyId
 * @desc    Delete an insurance policy
 * @access  Public
 */
insuranceRouter.delete("/:policyId", async (req, res) => {
  try {
    await insuranceService.deletePolicy(req.params.policyId);
    res.json({
      success: true,
      message: "Insurance policy deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting insurance policy:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete insurance policy",
      error: error.message,
    });
  }
});

module.exports = { insuranceRouter };
