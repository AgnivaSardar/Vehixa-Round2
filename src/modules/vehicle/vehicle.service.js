const { prisma } = require("../../config/db");
const { evaluateTelemetry, toVehicleStatus } = require("../health/health.scoring");

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
        updatedAt: "desc",
      },
    });

    const enrichedVehicles = await Promise.all(
      vehicles.map(async (vehicle) => {
        const latestTelemetry = await prisma.telemtery2.findFirst({
          where: { vehicleId: vehicle.vehicleId },
          orderBy: { recordedAt: "desc" },
        });

        const evaluation = evaluateTelemetry(latestTelemetry);

        return {
          id: vehicle.vehicleId,
          vehicleId: vehicle.vehicleId,
          name: `${vehicle.manufacturer || "Unknown"} ${vehicle.model || "Vehicle"}`,
          plate: vehicle.vehicleNumber || "N/A",
          type: vehicle.vehicleType || "UNKNOWN",
          healthScore: Math.round(evaluation.healthScore),
          status: toVehicleStatus(evaluation.status),
          lastUpdate: latestTelemetry?.recordedAt || vehicle.updatedAt,
          driver: vehicle.user?.name || "Unassigned",
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
      orderBy: { recordedAt: "desc" },
    });

    const evaluation = evaluateTelemetry(latestTelemetry);

    return {
      id: vehicle.vehicleId,
      vehicleId: vehicle.vehicleId,
      name: `${vehicle.manufacturer || "Unknown"} ${vehicle.model || "Vehicle"}`,
      plate: vehicle.vehicleNumber || "N/A",
      type: vehicle.vehicleType || "UNKNOWN",
      healthScore: Math.round(evaluation.healthScore),
      status: toVehicleStatus(evaluation.status),
      lastUpdate: latestTelemetry?.recordedAt || vehicle.updatedAt,
      driver: vehicle.user?.name || "Unassigned",
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
