const { prisma } = require("../../config/db");

/**
 * Get all insurance policies with vehicle details
 */
async function getAllPolicies() {
  return await prisma.insurancePolicy.findMany({
    include: {
      vehicle: {
        select: {
          vehicleId: true,
          vehicleNumber: true,
          manufacturer: true,
          model: true,
          year: true,
          status: true,
        },
      },
    },
    orderBy: {
      expiryDate: "asc",
    },
  });
}

/**
 * Get insurance KPI statistics
 */
async function getInsuranceStats() {
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  // Total vehicles
  const totalVehicles = await prisma.vehicle.count();

  // Vehicles with active insurance (expiry date in the future)
  const vehiclesWithInsurance = await prisma.insurancePolicy.count({
    where: {
      expiryDate: {
        gte: now,
      },
    },
  });

  // Policies expiring within 7 days
  const expiringWithin7Days = await prisma.insurancePolicy.count({
    where: {
      expiryDate: {
        gte: now,
        lte: sevenDaysFromNow,
      },
    },
  });

  // Expired policies
  const expiredPolicies = await prisma.insurancePolicy.count({
    where: {
      expiryDate: {
        lt: now,
      },
    },
  });

  // Coverage percentage
  const coveragePercentage =
    totalVehicles > 0
      ? Math.round((vehiclesWithInsurance / totalVehicles) * 100)
      : 0;

  // Uninsured vehicles (vehicles without any insurance policy)
  const vehiclesWithPolicies = await prisma.insurancePolicy.findMany({
    select: {
      vehicleId: true,
    },
    distinct: ["vehicleId"],
  });

  const uninsuredCount = totalVehicles - vehiclesWithPolicies.length;

  return {
    totalVehicles,
    vehiclesWithInsurance,
    coveragePercentage,
    expiringWithin7Days,
    expiredPolicies,
    uninsuredCount,
    totalExpiredOrUninsured: expiredPolicies + uninsuredCount,
  };
}

/**
 * Get urgent policies (expiring within 7 days or already expired)
 */
async function getUrgentPolicies() {
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const urgentPolicies = await prisma.insurancePolicy.findMany({
    where: {
      expiryDate: {
        lte: sevenDaysFromNow,
      },
    },
    include: {
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
      expiryDate: "asc",
    },
  });

  // Calculate days remaining for each policy
  return urgentPolicies.map((policy) => {
    const daysRemaining = Math.ceil(
      (new Date(policy.expiryDate) - now) / (1000 * 60 * 60 * 24)
    );

    return {
      ...policy,
      daysRemaining,
      isExpired: daysRemaining < 0,
      urgencyLevel:
        daysRemaining < 0
          ? "expired"
          : daysRemaining <= 3
          ? "critical"
          : "warning",
    };
  });
}

/**
 * Get upcoming renewals (next 30 days)
 */
async function getUpcomingRenewals() {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  return await prisma.insurancePolicy.findMany({
    where: {
      expiryDate: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
    },
    include: {
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
      expiryDate: "asc",
    },
  });
}

/**
 * Get fleet insurance view (all vehicles with their insurance status)
 */
async function getFleetInsuranceView() {
  const now = new Date();

  const vehicles = await prisma.vehicle.findMany({
    include: {
      insurancePolicies: {
        orderBy: {
          expiryDate: "desc",
        },
        take: 1, // Get latest policy
      },
    },
  });

  return vehicles.map((vehicle) => {
    const latestPolicy = vehicle.insurancePolicies[0];

    if (!latestPolicy) {
      return {
        ...vehicle,
        insuranceStatus: "uninsured",
        latestPolicy: null,
        daysUntilExpiry: null,
      };
    }

    const daysUntilExpiry = Math.ceil(
      (new Date(latestPolicy.expiryDate) - now) / (1000 * 60 * 60 * 24)
    );

    const insuranceStatus =
      daysUntilExpiry < 0
        ? "expired"
        : daysUntilExpiry <= 7
        ? "expiring-soon"
        : "active";

    return {
      ...vehicle,
      insuranceStatus,
      latestPolicy,
      daysUntilExpiry,
      insurancePolicies: undefined, // Remove the array from response
    };
  });
}

/**
 * Add a new insurance policy
 */
async function addPolicy(policyData) {
  const { vehicleId, provider, policyNumber, startDate, expiryDate, documentUrl } =
    policyData;

  return await prisma.insurancePolicy.create({
    data: {
      vehicleId,
      provider,
      policyNumber,
      startDate: startDate ? new Date(startDate) : null,
      expiryDate: new Date(expiryDate),
      documentUrl: documentUrl || null,
    },
    include: {
      vehicle: true,
    },
  });
}

/**
 * Update an insurance policy
 */
async function updatePolicy(policyId, updateData) {
  const { provider, policyNumber, startDate, expiryDate, documentUrl } =
    updateData;

  return await prisma.insurancePolicy.update({
    where: { id: policyId },
    data: {
      ...(provider && { provider }),
      ...(policyNumber && { policyNumber }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(expiryDate && { expiryDate: new Date(expiryDate) }),
      ...(documentUrl !== undefined && { documentUrl }),
    },
    include: {
      vehicle: true,
    },
  });
}

/**
 * Delete an insurance policy
 */
async function deletePolicy(policyId) {
  return await prisma.insurancePolicy.delete({
    where: { id: policyId },
  });
}

module.exports = {
  getAllPolicies,
  getInsuranceStats,
  getUrgentPolicies,
  getUpcomingRenewals,
  getFleetInsuranceView,
  addPolicy,
  updatePolicy,
  deletePolicy,
};
