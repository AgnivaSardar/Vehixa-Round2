const express = require("express");
const dispatchService = require("./dispatch.service");

const dispatchRouter = express.Router();

/**
 * @route   GET /api/dispatch/stats
 * @desc    Get dispatch statistics (pending, active, critical counts)
 * @access  Public
 */
dispatchRouter.get("/stats", async (req, res) => {
  try {
    const stats = await dispatchService.getDispatchStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching dispatch stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dispatch stats",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/dispatch/pending
 * @desc    Get all pending dispatch requests
 * @access  Public
 */
dispatchRouter.get("/pending", async (req, res) => {
  try {
    const pendingRequests = await dispatchService.getPendingRequests();
    res.json({
      success: true,
      data: pendingRequests,
    });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending requests",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/dispatch/active
 * @desc    Get all active trips
 * @access  Public
 */
dispatchRouter.get("/active", async (req, res) => {
  try {
    const activeTrips = await dispatchService.getActiveTrips();
    res.json({
      success: true,
      data: activeTrips,
    });
  } catch (error) {
    console.error("Error fetching active trips:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active trips",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/dispatch/history
 * @desc    Get completed/rejected trips
 * @access  Public
 */
dispatchRouter.get("/history", async (req, res) => {
  try {
    const history = await dispatchService.getHistory();
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching dispatch history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dispatch history",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/dispatch
 * @desc    Create a new dispatch request
 * @access  Public
 */
dispatchRouter.post("/", async (req, res) => {
  try {
    const newRequest = await dispatchService.createRequest(req.body);
    res.status(201).json({
      success: true,
      message: "Dispatch request created successfully",
      data: newRequest,
    });
  } catch (error) {
    console.error("Error creating dispatch request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create dispatch request",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/dispatch/:requestId/approve
 * @desc    Approve and activate a dispatch request
 * @access  Public
 */
dispatchRouter.put("/:requestId/approve", async (req, res) => {
  try {
    const approved = await dispatchService.approveRequest(
      req.params.requestId,
      req.body
    );
    res.json({
      success: true,
      message: "Dispatch request approved successfully",
      data: approved,
    });
  } catch (error) {
    console.error("Error approving dispatch request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve dispatch request",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/dispatch/:requestId/complete
 * @desc    Mark a trip as completed
 * @access  Public
 */
dispatchRouter.put("/:requestId/complete", async (req, res) => {
  try {
    const completed = await dispatchService.completeTrip(req.params.requestId);
    res.json({
      success: true,
      message: "Trip completed successfully",
      data: completed,
    });
  } catch (error) {
    console.error("Error completing trip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete trip",
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/dispatch/:requestId/reject
 * @desc    Reject a dispatch request
 * @access  Public
 */
dispatchRouter.delete("/:requestId/reject", async (req, res) => {
  try {
    await dispatchService.rejectRequest(req.params.requestId);
    res.json({
      success: true,
      message: "Dispatch request rejected",
    });
  } catch (error) {
    console.error("Error rejecting dispatch request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject dispatch request",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/dispatch/location
 * @desc    Update live GPS location for active dispatch
 * @access  Public
 */
dispatchRouter.post("/location", async (req, res) => {
  try {
    const location = await dispatchService.updateLocation(req.body);
    res.json({
      success: true,
      message: "Location updated successfully",
      data: location,
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update location",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/dispatch/live-locations
 * @desc    Get all active driver locations (last 5 minutes)
 * @access  Public
 */
dispatchRouter.get("/live-locations", async (req, res) => {
  try {
    const locations = await dispatchService.getLiveLocations();
    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error("Error fetching live locations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch live locations",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/dispatch/auto-assign-preview
 * @desc    Preview best vehicle + driver match without creating request
 * @access  Public
 */
dispatchRouter.get("/auto-assign-preview", async (req, res) => {
  try {
    const preview = await dispatchService.previewAutoAssign(req.query);
    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    console.error("Error previewing auto-assign:", error);
    res.status(500).json({
      success: false,
      message: "Failed to preview auto-assignment",
      error: error.message,
    });
  }
});

module.exports = { dispatchRouter };
