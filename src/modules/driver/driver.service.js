const { prisma } = require("../../config/db");

/**
 * Get all driver profiles
 */
async function getAllDrivers() {
  return await prisma.driverProfile.findMany({
    include: {
      user: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          fleetRole: true,
          isActive: true,
          isApproved: true,
        },
      },
      assignedVehicle: {
        select: {
          vehicleId: true,
          vehicleNumber: true,
          manufacturer: true,
          model: true,
          year: true,
          status: true,
          fuelLevel: true,
        },
      },
    },
    orderBy: {
      safetyScore: "desc",
    },
  });
}

/**
 * Get driver statistics
 */
async function getDriverStats() {
  const [statusCounts, aggregate] = await Promise.all([
    prisma.driverProfile.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.driverProfile.aggregate({
      _avg: {
        safetyScore: true,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const countsByStatus = statusCounts.reduce((acc, item) => {
    acc[item.status] = item._count._all;
    return acc;
  }, {});

  return {
    total: aggregate._count._all,
    available: countsByStatus.AVAILABLE || 0,
    onTrip: countsByStatus.ON_TRIP || 0,
    offDuty: countsByStatus.OFF_DUTY || 0,
    avgSafetyScore: Math.round(aggregate._avg.safetyScore || 0),
  };
}

/**
 * Get a specific driver profile
 */
async function getDriverProfile(userId) {
  const profile = await prisma.driverProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          fleetRole: true,
          avatarUrl: true,
        },
      },
      assignedVehicle: {
        include: {
          insurancePolicies: {
            orderBy: { expiryDate: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!profile) {
    throw new Error("Driver profile not found");
  }

  return profile;
}

/**
 * Create or update a driver profile (upsert by userId)
 */
async function upsertDriverProfile(profileData) {
  const {
    userId,
    licenseNumber,
    licenseType,
    licenseExpiry,
    safetyScore,
    milesThisMonth,
    totalIncidents,
    onTimeRate,
    yearsExperience,
    assignedVehicleId,
    aadharNumber,
    medicalCertExpiry,
    address,
  } = profileData;

  return await prisma.driverProfile.upsert({
    where: { userId },
    create: {
      userId,
      licenseNumber,
      licenseType: licenseType || "HGMV",
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      safetyScore: safetyScore || 100,
      milesThisMonth: milesThisMonth || 0,
      totalIncidents: totalIncidents || 0,
      onTimeRate: onTimeRate || 100,
      yearsExperience: yearsExperience || 0,
      assignedVehicleId: assignedVehicleId || null,
      aadharNumber,
      medicalCertExpiry: medicalCertExpiry ? new Date(medicalCertExpiry) : null,
      address,
    },
    update: {
      ...(licenseNumber && { licenseNumber }),
      ...(licenseType && { licenseType }),
      ...(licenseExpiry && { licenseExpiry: new Date(licenseExpiry) }),
      ...(safetyScore !== undefined && { safetyScore }),
      ...(milesThisMonth !== undefined && { milesThisMonth }),
      ...(totalIncidents !== undefined && { totalIncidents }),
      ...(onTimeRate !== undefined && { onTimeRate }),
      ...(yearsExperience !== undefined && { yearsExperience }),
      ...(assignedVehicleId !== undefined && { assignedVehicleId }),
      ...(aadharNumber !== undefined && { aadharNumber }),
      ...(medicalCertExpiry !== undefined && {
        medicalCertExpiry: new Date(medicalCertExpiry),
      }),
      ...(address !== undefined && { address }),
    },
    include: {
      user: true,
      assignedVehicle: true,
    },
  });
}

/**
 * Update driver status
 */
async function updateDriverStatus(userId, status) {
  return await prisma.driverProfile.update({
    where: { userId },
    data: { status },
    include: {
      user: true,
      assignedVehicle: true,
    },
  });
}

/**
 * Assign a vehicle to a driver
 */
async function assignVehicle(userId, vehicleId) {
  return await prisma.driverProfile.update({
    where: { userId },
    data: {
      assignedVehicleId: vehicleId || null,
    },
    include: {
      user: true,
      assignedVehicle: true,
    },
  });
}

/**
 * Get trips for a specific driver
 */
async function getDriverTrips(userId) {
  return await prisma.dispatchRequest.findMany({
    where: {
      driverId: userId,
    },
    include: {
      vehicle: {
        select: {
          vehicleId: true,
          vehicleNumber: true,
          manufacturer: true,
          model: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

module.exports = {
  getAllDrivers,
  getDriverStats,
  getDriverProfile,
  upsertDriverProfile,
  updateDriverStatus,
  assignVehicle,
  getDriverTrips,
};
