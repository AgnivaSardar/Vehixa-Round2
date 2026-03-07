const express = require("express");
const maintenanceService = require("./maintenance.service");

const maintenanceRouter = express.Router();

/**
 * @route   GET /api/maintenance
 * @desc    Get all maintenance orders with optional filters
 * @access  Public
 */
maintenanceRouter.get("/", async (req, res) => {
  try {
    const { status, orderType, vehicleId } = req.query;
    const orders = await maintenanceService.getMaintenanceOrders({
      status,
      orderType,
      vehicleId,
    });
    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching maintenance orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch maintenance orders",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/maintenance/stats
 * @desc    Get maintenance KPI statistics
 * @access  Public
 */
maintenanceRouter.get("/stats", async (req, res) => {
  try {
    const stats = await maintenanceService.getMaintenanceStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching maintenance stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch maintenance stats",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/maintenance/cost-chart
 * @desc    Get 6-month maintenance cost trend
 * @access  Public
 */
maintenanceRouter.get("/cost-chart", async (req, res) => {
  try {
    const costData = await maintenanceService.getCostChart();
    res.json({
      success: true,
      data: costData,
    });
  } catch (error) {
    console.error("Error fetching cost chart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cost chart data",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/maintenance/proactive
 * @desc    Get upcoming proactive maintenance orders
 * @access  Public
 */
maintenanceRouter.get("/proactive", async (req, res) => {
  try {
    const proactive = await maintenanceService.getProactiveMaintenance();
    res.json({
      success: true,
      data: proactive,
    });
  } catch (error) {
    console.error("Error fetching proactive maintenance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch proactive maintenance",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/maintenance/alerts
 * @desc    Get maintenance alerts (overdue, high priority, etc.)
 * @access  Public
 */
maintenanceRouter.get("/alerts", async (req, res) => {
  try {
    const alerts = await maintenanceService.getMaintenanceAlerts();
    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Error fetching maintenance alerts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch maintenance alerts",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/maintenance/history/:vehicleId
 * @desc    Get service history for a specific vehicle
 * @access  Public
 */
maintenanceRouter.get("/history/:vehicleId", async (req, res) => {
  try {
    const history = await maintenanceService.getServiceHistory(
      req.params.vehicleId
    );
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching service history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch service history",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/maintenance
 * @desc    Create a new maintenance order
 * @access  Public
 */
maintenanceRouter.post("/", async (req, res) => {
  try {
    const newOrder = await maintenanceService.createMaintenanceOrder(req.body);
    res.status(201).json({
      success: true,
      message: "Maintenance order created successfully",
      data: newOrder,
    });
  } catch (error) {
    console.error("Error creating maintenance order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create maintenance order",
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/maintenance/:orderId/status
 * @desc    Update Kanban status of a maintenance order
 * @access  Public
 */
maintenanceRouter.patch("/:orderId/status", async (req, res) => {
  try {
    const updated = await maintenanceService.updateOrderStatus(
      req.params.orderId,
      req.body.status
    );
    res.json({
      success: true,
      message: "Maintenance order status updated",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/maintenance/:orderId
 * @desc    Update maintenance order details
 * @access  Public
 */
maintenanceRouter.put("/:orderId", async (req, res) => {
  try {
    const updated = await maintenanceService.updateOrder(
      req.params.orderId,
      req.body
    );
    res.json({
      success: true,
      message: "Maintenance order updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating maintenance order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update maintenance order",
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/maintenance/:orderId
 * @desc    Delete a maintenance order
 * @access  Public
 */
maintenanceRouter.delete("/:orderId", async (req, res) => {
  try {
    await maintenanceService.deleteOrder(req.params.orderId);
    res.json({
      success: true,
      message: "Maintenance order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting maintenance order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete maintenance order",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/maintenance/downtime
 * @desc    Get downtime statistics
 * @access  Public
 */
maintenanceRouter.get("/downtime", async (req, res) => {
  try {
    const downtime = await maintenanceService.getDowntimeStats();
    res.json({
      success: true,
      data: downtime,
    });
  } catch (error) {
    console.error("Error fetching downtime stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch downtime statistics",
      error: error.message,
    });
  }
});

module.exports = { maintenanceRouter };
