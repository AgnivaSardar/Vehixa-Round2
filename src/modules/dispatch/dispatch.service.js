const { prisma } = require("../../config/db");

/**
 * Generate unique ticket number (REQ-XXXX format)
 */
function generateTicketNumber() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `REQ-${randomNum}`;
}

/**
 * Get dispatch statistics
 */
async function getDispatchStats() {
  const [pending, active, highPriority, completed, rejected] = await Promise.all([
    prisma.dispatchRequest.count({
      where: { status: "PENDING" },
    }),
    prisma.dispatchRequest.count({
      where: { status: "ACTIVE" },
    }),
    prisma.dispatchRequest.count({
      where: {
        priority: "HIGH",
        status: { in: ["PENDING", "ACTIVE"] },
      },
    }),
    prisma.dispatchRequest.count({
      where: { status: "COMPLETED" },
    }),
    prisma.dispatchRequest.count({
      where: { status: "REJECTED" },
    }),
  ]);

  return {
    pending,
    active,
    highPriority,
    completed,
    rejected,
    total: pending + active + completed + rejected,
  };
}

/**
 * Get all pending dispatch requests
 */
async function getPendingRequests() {
  return await prisma.dispatchRequest.findMany({
    where: { status: "PENDING" },
    include: {
      driver: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },
      vehicle: {
        select: {
          vehicleId: true,
          vehicleNumber: true,
          manufacturer: true,
          model: true,
          year: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Get all active trips
 */
async function getActiveTrips() {
  return await prisma.dispatchRequest.findMany({
    where: { status: "ACTIVE" },
    include: {
      driver: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      vehicle: {
        select: {
          vehicleId: true,
          vehicleNumber: true,
          manufacturer: true,
          model: true,
          year: true,
          fuelLevel: true,
          currentLocation: true,
        },
      },
      locations: {
        orderBy: {
          timestamp: "desc",
        },
        take: 1, // Get latest location
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Get dispatch history (completed/rejected)
 */
async function getHistory() {
  return await prisma.dispatchRequest.findMany({
    where: {
      status: {
        in: ["COMPLETED", "REJECTED"],
      },
    },
    include: {
      driver: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },
      vehicle: {
        select: {
          vehicleId: true,
          vehicleNumber: true,
          manufacturer: true,
          model: true,
          year: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 100, // Limit to last 100 records
  });
}

/**
 * Create a new dispatch request
 */
async function createRequest(requestData) {
  const {
    origin,
    destination,
    cargoType,
    cargoWeight,
    priority = "STANDARD",
    driverId,
    vehicleId,
  } = requestData;

  // Generate unique ticket number
  let ticketNumber;
  let isUnique = false;

  while (!isUnique) {
    ticketNumber = generateTicketNumber();
    const existing = await prisma.dispatchRequest.findUnique({
      where: { ticketNumber },
    });
    if (!existing) isUnique = true;
  }

  return await prisma.dispatchRequest.create({
    data: {
      ticketNumber,
      origin,
      destination,
      cargoType,
      cargoWeight,
      priority,
      driverId: driverId || null,
      vehicleId: vehicleId || null,
      status: "PENDING",
    },
    include: {
      driver: true,
      vehicle: true,
    },
  });
}

/**
 * Approve and activate a dispatch request
 */
async function approveRequest(requestId, approvalData) {
  const { driverId, vehicleId } = approvalData;

  // Update dispatch request to ACTIVE
  const updated = await prisma.dispatchRequest.update({
    where: { id: requestId },
    data: {
      status: "ACTIVE",
      driverId: driverId || undefined,
      vehicleId: vehicleId || undefined,
    },
    include: {
      driver: true,
      vehicle: true,
    },
  });

  // If driver is assigned, update driver status to ON_TRIP
  if (driverId) {
    await prisma.driverProfile.updateMany({
      where: { userId: driverId },
      data: { status: "ON_TRIP" },
    });
  }

  return updated;
}

/**
 * Complete a trip
 */
async function completeTrip(requestId) {
  const dispatch = await prisma.dispatchRequest.findUnique({
    where: { id: requestId },
    include: { driver: true },
  });

  if (!dispatch) {
    throw new Error("Dispatch request not found");
  }

  // Update dispatch to COMPLETED
  const completed = await prisma.dispatchRequest.update({
    where: { id: requestId },
    data: {
      status: "COMPLETED",
      progressPct: 100,
    },
    include: {
      driver: true,
      vehicle: true,
    },
  });

  // Reset driver status to AVAILABLE
  if (dispatch.driverId) {
    await prisma.driverProfile.updateMany({
      where: { userId: dispatch.driverId },
      data: { status: "AVAILABLE" },
    });
  }

  return completed;
}

/**
 * Reject a dispatch request
 */
async function rejectRequest(requestId) {
  return await prisma.dispatchRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" },
  });
}

/**
 * Update live GPS location
 */
async function updateLocation(locationData) {
  const { dispatchId, latitude, longitude, speed } = locationData;

  // Verify dispatch exists and is active
  const dispatch = await prisma.dispatchRequest.findUnique({
    where: { id: dispatchId },
  });

  if (!dispatch) {
    throw new Error("Dispatch request not found");
  }

  if (dispatch.status !== "ACTIVE") {
    throw new Error("Can only update location for active dispatches");
  }

  // Create location record
  const location = await prisma.driverLocation.create({
    data: {
      dispatchId,
      latitude,
      longitude,
      speed: speed || null,
    },
  });

  // Also update the dispatch with latest speed
  if (speed !== undefined) {
    await prisma.dispatchRequest.update({
      where: { id: dispatchId },
      data: { speed },
    });
  }

  return location;
}

/**
 * Get live locations for all active dispatches (last 5 minutes)
 */
async function getLiveLocations() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  return await prisma.driverLocation.findMany({
    where: {
      timestamp: {
        gte: fiveMinutesAgo,
      },
      dispatch: {
        status: "ACTIVE",
      },
    },
    include: {
      dispatch: {
        include: {
          driver: {
            select: {
              userId: true,
              name: true,
              phone: true,
            },
          },
          vehicle: {
            select: {
              vehicleId: true,
              vehicleNumber: true,
              manufacturer: true,
              model: true,
            },
          },
        },
      },
    },
    orderBy: {
      timestamp: "desc",
    },
  });
}

/**
 * Preview auto-assignment (best vehicle + driver match)
 */
async function previewAutoAssign(criteria) {
  // Get available drivers
  const availableDrivers = await prisma.driverProfile.findMany({
    where: {
      status: "AVAILABLE",
    },
    include: {
      user: {
        select: {
          userId: true,
          name: true,
          email: true,
        },
      },
      assignedVehicle: {
        select: {
          vehicleId: true,
          vehicleNumber: true,
          manufacturer: true,
          model: true,
          status: true,
          fuelLevel: true,
        },
      },
    },
  });

  // Score each driver based on:
  // - Safety score (higher is better)
  // - Years of experience (more is better)
  // - On-time rate (higher is better)
  // - Vehicle fuel level (higher is better)
  // - Vehicle status (ACTIVE is preferred)

  const scoredDrivers = availableDrivers
    .filter((driver) => driver.assignedVehicle) // Must have assigned vehicle
    .filter((driver) => driver.assignedVehicle.status === "ACTIVE") // Vehicle must be active
    .map((driver) => {
      const safetyScore = driver.safetyScore || 50;
      const experienceScore = Math.min(driver.yearsExperience * 10, 100);
      const onTimeScore = driver.onTimeRate || 50;
      const fuelScore = driver.assignedVehicle.fuelLevel || 0;

      const totalScore =
        safetyScore * 0.4 +
        experienceScore * 0.2 +
        onTimeScore * 0.2 +
        fuelScore * 0.2;

      return {
        driver,
        score: totalScore,
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    recommendedDriver: scoredDrivers[0] || null,
    alternatives: scoredDrivers.slice(1, 4), // Top 3 alternatives
  };
}

module.exports = {
  getDispatchStats,
  getPendingRequests,
  getActiveTrips,
  getHistory,
  createRequest,
  approveRequest,
  completeTrip,
  rejectRequest,
  updateLocation,
  getLiveLocations,
  previewAutoAssign,
};
