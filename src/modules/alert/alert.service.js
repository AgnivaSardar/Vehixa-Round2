const { prisma } = require("../../config/db");

const alertService = {
  async list({ vehicleId, severity, isResolved, limit = 100 } = {}) {
    const where = {};
    
    if (vehicleId) {
      where.vehicleId = vehicleId;
    }
    
    if (severity) {
      where.severity = severity.toUpperCase();
    }
    
    if (isResolved !== undefined) {
      where.isResolved = isResolved === 'true' || isResolved === true;
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        vehicle: {
          select: {
            vehicleId: true,
            manufacturer: true,
            model: true,
            vehicleNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Number(limit) || 100,
    });

    return alerts.map(alert => ({
      id: alert.alertId,
      alertId: alert.alertId,
      vehicleId: alert.vehicleId,
      vehicleName: alert.vehicle 
        ? `${alert.vehicle.manufacturer || 'Unknown'} ${alert.vehicle.model || 'Vehicle'}`
        : 'Unknown Vehicle',
      vehiclePlate: alert.vehicle?.vehicleNumber || 'N/A',
      type: alert.title,
      severity: alert.severity.toLowerCase(),
      message: alert.message,
      suggestedAction: getSuggestedAction(alert.title, alert.severity),
      timestamp: alert.createdAt,
      acknowledged: alert.isResolved,
      isResolved: alert.isResolved,
    }));
  },

  async getById(alertId) {
    const alert = await prisma.alert.findUnique({
      where: { alertId },
      include: {
        vehicle: {
          select: {
            vehicleId: true,
            manufacturer: true,
            model: true,
            vehicleNumber: true,
          },
        },
      },
    });

    if (!alert) {
      return null;
    }

    return {
      id: alert.alertId,
      alertId: alert.alertId,
      vehicleId: alert.vehicleId,
      vehicleName: alert.vehicle 
        ? `${alert.vehicle.manufacturer || 'Unknown'} ${alert.vehicle.model || 'Vehicle'}`
        : 'Unknown Vehicle',
      vehiclePlate: alert.vehicle?.vehicleNumber || 'N/A',
      type: alert.title,
      severity: alert.severity.toLowerCase(),
      message: alert.message,
      suggestedAction: getSuggestedAction(alert.title, alert.severity),
      timestamp: alert.createdAt,
      acknowledged: alert.isResolved,
      isResolved: alert.isResolved,
    };
  },

  async acknowledge(alertId) {
    const alert = await prisma.alert.update({
      where: { alertId },
      data: { isResolved: true },
    });

    return this.getById(alertId);
  },

  async getStats() {
    const [critical, high, medium, low, resolved, unresolved] = await Promise.all([
      prisma.alert.count({ where: { severity: 'CRITICAL', isResolved: false } }),
      prisma.alert.count({ where: { severity: 'HIGH', isResolved: false } }),
      prisma.alert.count({ where: { severity: 'MEDIUM', isResolved: false } }),
      prisma.alert.count({ where: { severity: 'LOW', isResolved: false } }),
      prisma.alert.count({ where: { isResolved: true } }),
      prisma.alert.count({ where: { isResolved: false } }),
    ]);

    // Get common fault types
    const commonFaults = await prisma.alert.groupBy({
      by: ['title'],
      _count: {
        alertId: true,
      },
      orderBy: {
        _count: {
          alertId: 'desc',
        },
      },
      take: 5,
    });

    // Get vehicles with most alerts
    const topAlertVehicles = await prisma.alert.groupBy({
      by: ['vehicleId'],
      _count: {
        alertId: true,
      },
      where: {
        isResolved: false,
      },
      orderBy: {
        _count: {
          alertId: 'desc',
        },
      },
      take: 5,
    });

    const enrichedTopVehicles = await Promise.all(
      topAlertVehicles.map(async (item) => {
        const vehicle = await prisma.vehicle.findUnique({
          where: { vehicleId: item.vehicleId },
          select: {
            manufacturer: true,
            model: true,
            vehicleNumber: true,
          },
        });
        return {
          vehicleId: item.vehicleId,
          vehicle: vehicle 
            ? `${vehicle.manufacturer || ''} ${vehicle.model || 'Unknown'}`.trim()
            : 'Unknown Vehicle',
          alerts: item._count.alertId,
        };
      })
    );

    return {
      severityBreakdown: {
        critical,
        high,
        medium,
        low,
      },
      statusBreakdown: {
        resolved,
        unresolved,
      },
      commonFaults: commonFaults.map(f => ({
        name: f.title,
        count: f._count.alertId,
      })),
      topAlertVehicles: enrichedTopVehicles,
    };
  },
};

function getSuggestedAction(title, severity) {
  const actions = {
    ENGINE_OVERHEATING_CRITICAL: 'Immediately pull over and shut down engine. Schedule emergency maintenance.',
    ENGINE_TEMP_WARNING: 'Monitor closely. Reduce speed if temperature continues rising.',
    BATTERY_VOLTAGE_LOW: 'Schedule battery inspection within 24 hours.',
    BATTERY_VOLTAGE_CRITICAL: 'Vehicle may stall. Pull over safely and request roadside assistance.',
    COOLANT_TEMP_HIGH: 'Check coolant levels. Reduce load and monitor temperature.',
    OIL_PRESSURE_LOW: 'Check oil levels immediately. Do not operate until resolved.',
    VIBRATION_HIGH: 'Schedule inspection for suspension, wheels, and alignment.',
    RPM_HIGH: 'Reduce throttle. Check for transmission issues.',
  };

  return actions[title] || `Alert detected. ${severity === 'CRITICAL' ? 'Immediate' : 'Scheduled'} maintenance recommended.`;
}

module.exports = { alertService };
