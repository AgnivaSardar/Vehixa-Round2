const { prisma } = require("../../config/db");

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getRangePenalty = (value, config) => {
  const numericValue = toFiniteNumber(value);
  if (numericValue === null) return { penalty: 0, isCritical: false, hasValue: false };

  const {
    idealMin = Number.NEGATIVE_INFINITY,
    idealMax = Number.POSITIVE_INFINITY,
    warnLow = Number.NEGATIVE_INFINITY,
    warnHigh = Number.POSITIVE_INFINITY,
    maxPenalty = 0,
    checkLow = true,
    checkHigh = true,
  } = config;

  let penalty = 0;
  let isCritical = false;

  if (checkLow && numericValue < idealMin) {
    if (numericValue <= warnLow) {
      penalty = maxPenalty;
      isCritical = true;
    } else if (idealMin > warnLow) {
      penalty = ((idealMin - numericValue) / (idealMin - warnLow)) * maxPenalty;
    } else {
      penalty = maxPenalty * 0.5;
    }
  }

  if (checkHigh && numericValue > idealMax) {
    let highPenalty = 0;

    if (numericValue >= warnHigh) {
      highPenalty = maxPenalty;
      isCritical = true;
    } else if (warnHigh > idealMax) {
      highPenalty = ((numericValue - idealMax) / (warnHigh - idealMax)) * maxPenalty;
    } else {
      highPenalty = maxPenalty * 0.5;
    }

    penalty = Math.max(penalty, highPenalty);
  }

  return {
    penalty: clamp(penalty, 0, maxPenalty),
    isCritical,
    hasValue: true,
  };
};

const calculateTelemetryHealth = (telemetry) => {
  if (!telemetry) {
    return {
      healthScore: 60,
      status: "warning",
    };
  }

  const checks = [
    {
      value: telemetry.engineTemp,
      config: { idealMin: 70, idealMax: 105, warnLow: 55, warnHigh: 120, maxPenalty: 20 },
    },
    {
      value: telemetry.coolantTemp,
      config: { idealMin: 70, idealMax: 100, warnLow: 55, warnHigh: 112, maxPenalty: 16 },
    },
    {
      value: telemetry.lubOilPressure,
      config: { idealMin: 1.8, idealMax: 4.8, warnLow: 1.0, warnHigh: 6.5, maxPenalty: 18 },
    },
    {
      value: telemetry.oilPressure,
      config: { idealMin: 1.8, idealMax: 4.8, warnLow: 1.0, warnHigh: 6.5, maxPenalty: 12 },
    },
    {
      value: telemetry.fuelPressure,
      config: { idealMin: 10, idealMax: 24, warnLow: 6, warnHigh: 30, maxPenalty: 10 },
    },
    {
      value: telemetry.batteryVoltage,
      config: { idealMin: 12.0, idealMax: 14.6, warnLow: 11.2, warnHigh: 15.2, maxPenalty: 16 },
    },
    {
      value: telemetry.vibrationLevel,
      config: { idealMin: 0, idealMax: 1.2, warnLow: 0, warnHigh: 3.5, maxPenalty: 16, checkLow: false },
    },
    {
      value: telemetry.coolantLevel,
      config: { idealMin: 55, idealMax: 100, warnLow: 30, warnHigh: 100, maxPenalty: 12, checkHigh: false },
    },
    {
      value: telemetry.engineRpm,
      config: { idealMin: 650, idealMax: 3800, warnLow: 450, warnHigh: 6000, maxPenalty: 8 },
    },
    {
      value: telemetry.batteryStateOfCharge,
      config: { idealMin: 20, idealMax: 95, warnLow: 8, warnHigh: 100, maxPenalty: 10, checkHigh: false },
    },
    {
      value: telemetry.batteryTemp,
      config: { idealMin: 10, idealMax: 45, warnLow: 0, warnHigh: 60, maxPenalty: 10 },
    },
    {
      value: telemetry.motorTemp,
      config: { idealMin: 15, idealMax: 90, warnLow: 0, warnHigh: 120, maxPenalty: 12 },
    },
    {
      value: telemetry.inverterTemp,
      config: { idealMin: 15, idealMax: 85, warnLow: 0, warnHigh: 110, maxPenalty: 10 },
    },
  ];

  let totalPenalty = 0;
  let hasCriticalMetric = false;
  let populatedMetrics = 0;

  for (const check of checks) {
    const result = getRangePenalty(check.value, check.config);
    totalPenalty += result.penalty;
    if (result.isCritical) hasCriticalMetric = true;
    if (result.hasValue) populatedMetrics += 1;
  }

  const errorCodes = toFiniteNumber(telemetry.errorCodesCount);
  if (errorCodes !== null && errorCodes > 0) {
    totalPenalty += Math.min(errorCodes * 4, 20);
    if (errorCodes >= 4) hasCriticalMetric = true;
    populatedMetrics += 1;
  }

  let healthScore = 100 - totalPenalty;

  // Penalize sparse payloads so health is not over-optimistic with too little data.
  if (populatedMetrics < 4) {
    healthScore -= 18;
  } else if (populatedMetrics < 7) {
    healthScore -= 8;
  }

  healthScore = clamp(Math.round(healthScore), 0, 100);

  let status = "healthy";
  if (healthScore < 45 || hasCriticalMetric) {
    status = "critical";
  } else if (healthScore < 80) {
    status = "warning";
  }

  return {
    healthScore,
    status,
  };
};

const vehicleService = {
  async list({ userId } = {}) {
    const where = userId ? { userId } : {};
    
    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            alerts: {
              where: { isResolved: false },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Enhance with latest telemetry and health score
    const enrichedVehicles = await Promise.all(
      vehicles.map(async (vehicle) => {
        const latestTelemetry = await prisma.telemtery2.findFirst({
          where: { vehicleId: vehicle.vehicleId },
          orderBy: { recordedAt: 'desc' },
        });

        const health = calculateTelemetryHealth(latestTelemetry);

        return {
          id: vehicle.vehicleId,
          vehicleId: vehicle.vehicleId,
          name: `${vehicle.manufacturer || 'Unknown'} ${vehicle.model || 'Vehicle'}`,
          plate: vehicle.vehicleNumber || 'N/A',
          type: vehicle.vehicleType || 'UNKNOWN',
          healthScore: health.healthScore,
          status: health.status,
          lastUpdate: latestTelemetry?.recordedAt || vehicle.updatedAt,
          driver: vehicle.user?.name || 'Unassigned',
          mileage: latestTelemetry?.mileage || 0,
          activeAlerts: vehicle._count.alerts,
          manufacturer: vehicle.manufacturer,
          model: vehicle.model,
          year: vehicle.year,
          vin: vehicle.vin,
          fuelType: vehicle.fuelType,
          latestTelemetry,
        };
      })
    );

    return enrichedVehicles;
  },

  async getById(vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { vehicleId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!vehicle) {
      return null;
    }

    const latestTelemetry = await prisma.telemtery2.findFirst({
      where: { vehicleId: vehicle.vehicleId },
      orderBy: { recordedAt: 'desc' },
    });

    const health = calculateTelemetryHealth(latestTelemetry);

    return {
      id: vehicle.vehicleId,
      vehicleId: vehicle.vehicleId,
      name: `${vehicle.manufacturer || 'Unknown'} ${vehicle.model || 'Vehicle'}`,
      plate: vehicle.vehicleNumber || 'N/A',
      type: vehicle.vehicleType || 'UNKNOWN',
      healthScore: health.healthScore,
      status: health.status,
      lastUpdate: latestTelemetry?.recordedAt || vehicle.updatedAt,
      driver: vehicle.user?.name || 'Unassigned',
      mileage: latestTelemetry?.mileage || 0,
      manufacturer: vehicle.manufacturer,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin,
      fuelType: vehicle.fuelType,
      latestTelemetry,
    };
  },
};

module.exports = { vehicleService };
