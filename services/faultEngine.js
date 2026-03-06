const WINDOW_SIZE = 5;

const metricRules = [
  // Engine
  { field: "engineTemp", warn: 105, crit: 115, type: "HIGH", code: "ENGINE_OVERHEAT" },
  { field: "engineRpm", warn: 4500, crit: 5500, type: "HIGH", code: "HIGH_ENGINE_RPM" },
  { field: "engineLoad", warn: 85, crit: 95, type: "HIGH", code: "HIGH_ENGINE_LOAD" },
  { field: "throttlePosition", warn: 85, crit: 95, type: "HIGH", code: "THROTTLE_FULL" },

  // Cooling
  { field: "coolantTemp", warn: 105, crit: 115, type: "HIGH", code: "COOLANT_OVERHEAT" },
  { field: "coolantPressure", warn: 11, crit: 9, type: "LOW", code: "LOW_COOLANT_PRESSURE" },
  { field: "coolantLevel", warn: 35, crit: 20, type: "LOW", code: "LOW_COOLANT_LEVEL" },

  // Oil
  { field: "lubOilPressure", warn: 15, crit: 10, type: "LOW", code: "LOW_LUB_OIL_PRESSURE" },
  { field: "oilPressure", warn: 15, crit: 10, type: "LOW", code: "LOW_ENGINE_OIL_PRESSURE" },
  { field: "lubOilTemp", warn: 120, crit: 130, type: "HIGH", code: "HIGH_OIL_TEMPERATURE" },

  // Fuel
  { field: "fuelPressure", warn: 30, crit: 25, type: "LOW", code: "LOW_FUEL_PRESSURE" },
  { field: "fuelEfficiency", warn: 12, crit: 9, type: "LOW", code: "POOR_FUEL_EFFICIENCY" },

  // Electrical
  { field: "batteryVoltage", warn: 12, crit: 11.8, type: "LOW", code: "LOW_BATTERY" },

  // Mechanical
  { field: "vibrationLevel", warn: 0.9, crit: 1.2, type: "HIGH", code: "EXCESS_ENGINE_VIBRATION" },

  // Environment
  { field: "ambientTemperature", warn: 45, crit: 50, type: "HIGH", code: "HIGH_AMBIENT_TEMPERATURE" }
];

function detectMetricAlerts(telemetry) {
  const alerts = [];

  for (const rule of metricRules) {
    const value = telemetry[rule.field];
    if (value === null || value === undefined) continue;

    if (rule.type === "HIGH") {
      if (value >= rule.crit) alerts.push(`${rule.code}_CRITICAL`);
      else if (value >= rule.warn) alerts.push(`${rule.code}_WARNING`);
    }

    if (rule.type === "LOW") {
      if (value <= rule.crit) alerts.push(`${rule.code}_CRITICAL`);
      else if (value <= rule.warn) alerts.push(`${rule.code}_WARNING`);
    }
  }

  return alerts;
}

const systemFaultRules = [
  {
    code: "ENGINE_FAILURE_IMMINENT",
    severity: "CRITICAL",
    triggers: [
      "ENGINE_OVERHEAT_CRITICAL",
      "LOW_LUB_OIL_PRESSURE_CRITICAL",
      "EXCESS_ENGINE_VIBRATION_CRITICAL"
    ]
  },

  {
    code: "COOLING_SYSTEM_FAILURE",
    severity: "HIGH",
    triggers: [
      "ENGINE_OVERHEAT_WARNING",
      "COOLANT_OVERHEAT_WARNING",
      "LOW_COOLANT_LEVEL_WARNING",
      "LOW_COOLANT_PRESSURE_WARNING"
    ],
    minTriggers: 2
  },

  {
    code: "ENGINE_LUBRICATION_FAILURE",
    severity: "HIGH",
    triggers: [
      "LOW_LUB_OIL_PRESSURE_WARNING",
      "HIGH_OIL_TEMPERATURE_WARNING",
      "ENGINE_OVERHEAT_WARNING"
    ],
    minTriggers: 2
  },

  {
    code: "ENGINE_INTERNAL_MECHANICAL_DAMAGE",
    severity: "HIGH",
    triggers: [
      "EXCESS_ENGINE_VIBRATION_WARNING",
      "LOW_ENGINE_OIL_PRESSURE_WARNING",
      "HIGH_ENGINE_LOAD_WARNING"
    ],
    minTriggers: 2
  },

  {
    code: "ENGINE_OVERLOAD_CONDITION",
    severity: "HIGH",
    triggers: [
      "HIGH_ENGINE_RPM_WARNING",
      "HIGH_ENGINE_LOAD_WARNING",
      "ENGINE_OVERHEAT_WARNING"
    ],
    minTriggers: 2
  },

  {
    code: "FUEL_DELIVERY_SYSTEM_FAULT",
    severity: "MEDIUM",
    triggers: [
      "LOW_FUEL_PRESSURE_WARNING",
      "POOR_FUEL_EFFICIENCY_WARNING",
      "HIGH_ENGINE_LOAD_WARNING"
    ],
    minTriggers: 2
  },

  {
    code: "ELECTRICAL_SYSTEM_FAILURE",
    severity: "HIGH",
    triggers: [
      "LOW_BATTERY_WARNING"
    ]
  }
];

async function getRecentTelemetry(prisma, vehicleId) {
  return prisma.telemtery2.findMany({
    where: { vehicleId },
    orderBy: { receivedAt: "desc" },
    take: WINDOW_SIZE
  });
}

function detectSystemFault(metricAlerts) {
  for (const rule of systemFaultRules) {
    const matched = rule.triggers.filter(a => metricAlerts.includes(a));

    if (
      matched.length >= (rule.minTriggers || rule.triggers.length)
    ) {
      return {
        fault: rule.code,
        severity: rule.severity
      };
    }
  }

  return null;
}

async function runFaultEngine(prisma, telemetry) {
  const metricAlerts = detectMetricAlerts(telemetry);

  const recentTelemetry = await getRecentTelemetry(prisma, telemetry.vehicleId);

  const fault = detectSystemFault(metricAlerts);

  return {
    vehicleId: telemetry.vehicleId,
    metricAlerts,
    systemFault: fault?.fault || null,
    severity: fault?.severity || null,
    detectedAt: new Date()
  };
}

module.exports = {
  runFaultEngine
};