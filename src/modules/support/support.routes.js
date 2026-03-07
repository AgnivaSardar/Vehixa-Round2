const express = require("express");
const supportService = require("./support.service");

const supportRouter = express.Router();

/**
 * @route   GET /api/support/tickets
 * @desc    Get all support tickets with optional filters
 * @access  Public
 */
supportRouter.get("/tickets", async (req, res) => {
  try {
    const { status, category, driverId } = req.query;
    const tickets = await supportService.getAllTickets({ status, category, driverId });
    res.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tickets",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/support/tickets/stats
 * @desc    Get ticket statistics
 * @access  Public
 */
supportRouter.get("/tickets/stats", async (req, res) => {
  try {
    const stats = await supportService.getTicketStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching ticket stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ticket stats",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/support/tickets
 * @desc    Create a new support ticket
 * @access  Public
 */
supportRouter.post("/tickets", async (req, res) => {
  try {
    const ticket = await supportService.createTicket(req.body);
    res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create ticket",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/support/tickets/:ticketId
 * @desc    Update a support ticket
 * @access  Public
 */
supportRouter.put("/tickets/:ticketId", async (req, res) => {
  try {
    const updated = await supportService.updateTicket(req.params.ticketId, req.body);
    res.json({
      success: true,
      message: "Ticket updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update ticket",
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/support/tickets/:ticketId
 * @desc    Delete a support ticket
 * @access  Public
 */
supportRouter.delete("/tickets/:ticketId", async (req, res) => {
  try {
    await supportService.deleteTicket(req.params.ticketId);
    res.json({
      success: true,
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete ticket",
      error: error.message,
    });
  }
});

module.exports = { supportRouter };
