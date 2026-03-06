const { prisma } = require("../../config/db");

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

        const latestHealth = await prisma.healthPrediction.findFirst({
          where: { vehicleId: vehicle.vehicleId },
          orderBy: { createdAt: 'desc' },
        });

        // Calculate health score based on alerts and health prediction
        let healthScore = latestHealth?.healthScore || 85;
        
        // Adjust health based on active alerts
        const criticalAlerts = await prisma.alert.count({
          where: {
            vehicleId: vehicle.vehicleId,
            isResolved: false,
            severity: 'CRITICAL',
          },
        });
        
        const highAlerts = await prisma.alert.count({
          where: {
            vehicleId: vehicle.vehicleId,
            isResolved: false,
            severity: 'HIGH',
          },
        });

        healthScore = healthScore - (criticalAlerts * 15) - (highAlerts * 8);
        healthScore = Math.max(0, Math.min(100, healthScore));

        // Determine status
        let status = 'healthy';
        if (healthScore < 40 || criticalAlerts > 0) {
          status = 'critical';
        } else if (healthScore < 70 || highAlerts > 0) {
          status = 'warning';
        }

        return {
          id: vehicle.vehicleId,
          vehicleId: vehicle.vehicleId,
          name: `${vehicle.manufacturer || 'Unknown'} ${vehicle.model || 'Vehicle'}`,
          plate: vehicle.vehicleNumber || 'N/A',
          type: vehicle.vehicleType || 'UNKNOWN',
          healthScore: Math.round(healthScore),
          status,
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

    const latestHealth = await prisma.healthPrediction.findFirst({
      where: { vehicleId: vehicle.vehicleId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate health score
    let healthScore = latestHealth?.healthScore || 85;
    
    const criticalAlerts = await prisma.alert.count({
      where: {
        vehicleId: vehicle.vehicleId,
        isResolved: false,
        severity: 'CRITICAL',
      },
    });
    
    const highAlerts = await prisma.alert.count({
      where: {
        vehicleId: vehicle.vehicleId,
        isResolved: false,
        severity: 'HIGH',
      },
    });

    healthScore = healthScore - (criticalAlerts * 15) - (highAlerts * 8);
    healthScore = Math.max(0, Math.min(100, healthScore));

    let status = 'healthy';
    if (healthScore < 40 || criticalAlerts > 0) {
      status = 'critical';
    } else if (healthScore < 70 || highAlerts > 0) {
      status = 'warning';
    }

    return {
      id: vehicle.vehicleId,
      vehicleId: vehicle.vehicleId,
      name: `${vehicle.manufacturer || 'Unknown'} ${vehicle.model || 'Vehicle'}`,
      plate: vehicle.vehicleNumber || 'N/A',
      type: vehicle.vehicleType || 'UNKNOWN',
      healthScore: Math.round(healthScore),
      status,
      lastUpdate: latestTelemetry?.recordedAt || vehicle.updatedAt,
      driver: vehicle.user?.name || 'Unassigned',
      mileage: latestTelemetry?.mileage || 0,
      manufacturer: vehicle.manufacturer,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin,
      fuelType: vehicle.fuelType,
      latestTelemetry,
      latestHealth,
    };
  },
};

module.exports = { vehicleService };
