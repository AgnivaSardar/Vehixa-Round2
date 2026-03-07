const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const metricRules = [
  {
    key: "engineTemp",
    label: "engine_temp",
    idealMin: 70,
    idealMax: 105,
    warnLow: 55,
    warnHigh: 120,
    maxPenalty: 20,
  },
  {
    key: "coolantTemp",
    label: "coolant_temp",
    idealMin: 70,
    idealMax: 100,
    warnLow: 55,
    warnHigh: 112,
    maxPenalty: 16,
  },
  {
    key: "lubOilPressure",
    label: "lub_oil_pressure",
    idealMin: 1.8,
    idealMax: 4.8,
    warnLow: 1.0,
    warnHigh: 6.5,
    maxPenalty: 18,
  },
  {
    key: "oilPressure",
    label: "oil_pressure",
    idealMin: 1.8,
    idealMax: 4.8,
    warnLow: 1.0,
    warnHigh: 6.5,
    maxPenalty: 12,
  },
  {
    key: "fuelPressure",
    label: "fuel_pressure",
    idealMin: 10,
    idealMax: 24,
    warnLow: 6,
    warnHigh: 30,
    maxPenalty: 10,
  },
  {
    key: "batteryVoltage",
    label: "battery_voltage",
    idealMin: 12.0,
    idealMax: 14.6,
    warnLow: 11.2,
    warnHigh: 15.2,
    maxPenalty: 16,
  },
  {
    key: "vibrationLevel",
    label: "vibration_level",
    idealMin: 0,
    idealMax: 1.2,
    warnLow: 0,
    warnHigh: 3.5,
    maxPenalty: 16,
    checkLow: false,
  },
  {
    key: "coolantLevel",
    label: "coolant_level",
    idealMin: 55,
    idealMax: 100,
    warnLow: 30,
    warnHigh: 100,
    maxPenalty: 12,
    checkHigh: false,
  },
  {
    key: "engineRpm",
    label: "engine_rpm",
    idealMin: 650,
    idealMax: 3800,
    warnLow: 450,
    warnHigh: 6000,
    maxPenalty: 8,
  },
  {
    key: "batteryStateOfCharge",
    label: "battery_state_of_charge",
    idealMin: 20,
    idealMax: 95,
    warnLow: 8,
    warnHigh: 100,
    maxPenalty: 10,
    checkHigh: false,
  },
  {
    key: "batteryTemp",
    label: "battery_temp",
    idealMin: 10,
    idealMax: 45,
    warnLow: 0,
    warnHigh: 60,
    maxPenalty: 10,
  },
  {
    key: "motorTemp",
    label: "motor_temp",
    idealMin: 15,
    idealMax: 90,
    warnLow: 0,
    warnHigh: 120,
    maxPenalty: 12,
  },
  {
    key: "inverterTemp",
    label: "inverter_temp",
    idealMin: 15,
    idealMax: 85,
    warnLow: 0,
    warnHigh: 110,
    maxPenalty: 10,
  },
];

const getRangePenalty = (value, rule) => {
  const numericValue = toFiniteNumber(value);
  if (numericValue === null) {
    return {
      hasValue: false,
      penalty: 0,
      isCritical: false,
      outOfRange: false,
      summary: null,
    };
  }

  const {
    key,
    label,
    idealMin = Number.NEGATIVE_INFINITY,
    idealMax = Number.POSITIVE_INFINITY,
    warnLow = Number.NEGATIVE_INFINITY,
    warnHigh = Number.POSITIVE_INFINITY,
    maxPenalty = 0,
    checkLow = true,
    checkHigh = true,
  } = rule;

  let penalty = 0;
  let isCritical = false;
  let outOfRange = false;
  let summary = null;

  if (checkLow && numericValue < idealMin) {
    outOfRange = true;
    summary = `${label} (${numericValue.toFixed(2)}) below safe range (${idealMin}-${idealMax})`;

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
    outOfRange = true;
    summary = `${label} (${numericValue.toFixed(2)}) above safe range (${idealMin}-${idealMax})`;

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
    key,
    label,
    hasValue: true,
    penalty: clamp(penalty, 0, maxPenalty),
    isCritical,
    outOfRange,
    summary,
  };
};

const toRiskLevel = (failureProbability) => {
  if (failureProbability >= 0.8) return "SEVERE";
  if (failureProbability >= 0.6) return "HIGH";
  if (failureProbability >= 0.35) return "MODERATE";
  return "LOW";
};

const toStatus = (healthScore, hasCriticalMetric) => {
  if (healthScore < 45 || hasCriticalMetric) return "CRITICAL";
  if (healthScore < 80) return "WARNING";
  return "HEALTHY";
};

const toVehicleStatus = (status) => {
  if (status === "CRITICAL") return "critical";
  if (status === "WARNING") return "warning";
  return "healthy";
};

const averagePenalty = (penaltiesByMetric, keys) => {
  const values = keys
    .map((key) => penaltiesByMetric[key])
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return clamp(avg, 0, 100);
};

const evaluateTelemetry = (telemetry) => {
  if (!telemetry) {
    return {
      healthScore: 60,
      status: "WARNING",
      failureProbability: 0.4,
      confidenceScore: 0.55,
      predictedFailureDays: 30,
      riskLevel: "MODERATE",
      modelVersion: "vehixa-rule-engine-v1",
      diagnosticAnalysis: "No telemetry found for selected vehicle.",
      topInfluentialFeatures: [],
      outOfRangeDetails: [],
      recommendations: [
        "No telemetry data available. Start telemetry ingest and run evaluation again.",
      ],
      components: {
        engine: 60,
        transmission: 60,
        battery: 60,
        cooling: 60,
        suspension: 60,
      },
    };
  }

  const penaltiesByMetric = {};
  let totalPenalty = 0;
  let hasCriticalMetric = false;
  let populatedMetrics = 0;
  const outOfRangeDetails = [];
  const penaltiesForRanking = [];

  for (const rule of metricRules) {
    const result = getRangePenalty(telemetry[rule.key], rule);

    penaltiesByMetric[rule.key] = result.penalty;
    totalPenalty += result.penalty;
    if (result.isCritical) hasCriticalMetric = true;
    if (result.hasValue) populatedMetrics += 1;

    if (result.outOfRange && result.summary) {
      outOfRangeDetails.push(result.summary);
    }

    if (result.penalty > 0) {
      penaltiesForRanking.push({
        key: rule.label,
        penalty: result.penalty,
      });
    }
  }

  const errorCodes = toFiniteNumber(telemetry.errorCodesCount);
  if (errorCodes !== null && errorCodes > 0) {
    const errorPenalty = Math.min(errorCodes * 4, 20);
    penaltiesByMetric.errorCodesCount = errorPenalty;
    totalPenalty += errorPenalty;
    populatedMetrics += 1;

    if (errorCodes >= 4) hasCriticalMetric = true;
    outOfRangeDetails.push(`error_codes_count (${errorCodes}) above safe threshold (0-3)`);
    penaltiesForRanking.push({
      key: "error_codes_count",
      penalty: errorPenalty,
    });
  }

  let healthScore = 100 - totalPenalty;

  // Penalize sparse packets to avoid false optimism.
  if (populatedMetrics < 4) {
    healthScore -= 18;
  } else if (populatedMetrics < 7) {
    healthScore -= 8;
  }

  healthScore = clamp(Math.round(healthScore), 0, 100);

  let failureProbability = clamp((100 - healthScore) / 100, 0.05, 0.99);
  if (hasCriticalMetric) {
    failureProbability = clamp(failureProbability + 0.15, 0.05, 0.99);
  }

  const status = toStatus(healthScore, hasCriticalMetric);
  const riskLevel = toRiskLevel(failureProbability);

  let predictedFailureDays = 90;
  if (riskLevel === "SEVERE") predictedFailureDays = 3;
  else if (riskLevel === "HIGH") predictedFailureDays = 10;
  else if (riskLevel === "MODERATE") predictedFailureDays = 30;

  const confidenceScore = clamp(0.55 + populatedMetrics * 0.03, 0.55, 0.95);

  const components = {
    engine: Math.round(
      clamp(
        100 -
          averagePenalty(penaltiesByMetric, [
            "engineRpm",
            "engineTemp",
            "lubOilPressure",
            "oilPressure",
            "fuelPressure",
          ]) *
            2.0,
        0,
        100
      )
    ),
    cooling: Math.round(
      clamp(
        100 -
          averagePenalty(penaltiesByMetric, [
            "coolantTemp",
            "coolantPressure",
            "coolantLevel",
          ]) *
            2.2,
        0,
        100
      )
    ),
    battery: Math.round(
      clamp(
        100 -
          averagePenalty(penaltiesByMetric, [
            "batteryVoltage",
            "batteryStateOfCharge",
            "batteryTemp",
          ]) *
            2.0,
        0,
        100
      )
    ),
    transmission: Math.round(
      clamp(
        100 -
          averagePenalty(penaltiesByMetric, [
            "engineRpm",
            "speed",
            "vibrationLevel",
          ]) *
            1.8,
        0,
        100
      )
    ),
    suspension: Math.round(
      clamp(100 - averagePenalty(penaltiesByMetric, ["vibrationLevel", "mileage"]) * 1.7, 0, 100)
    ),
  };

  const topInfluentialFeatures = penaltiesForRanking
    .sort((a, b) => b.penalty - a.penalty)
    .slice(0, 5)
    .map((item) => item.key);

  const recommendations = [];

  if (outOfRangeDetails.length > 0) {
    recommendations.push(
      `Detected ${outOfRangeDetails.length} parameter(s) outside safe ranges. Schedule an inspection promptly.`
    );
  }

  if (toFiniteNumber(telemetry.engineTemp) !== null && telemetry.engineTemp > 110) {
    recommendations.push("Engine temperature is high. Check coolant circuit and radiator airflow immediately.");
  }

  if (
    toFiniteNumber(telemetry.lubOilPressure) !== null &&
    telemetry.lubOilPressure < 1.5
  ) {
    recommendations.push("Lubrication oil pressure is low. Verify oil level and inspect for leaks before driving.");
  }

  if (
    toFiniteNumber(telemetry.batteryVoltage) !== null &&
    telemetry.batteryVoltage < 11.8
  ) {
    recommendations.push("Battery voltage is below normal. Test battery health and charging system.");
  }

  if (
    toFiniteNumber(telemetry.vibrationLevel) !== null &&
    telemetry.vibrationLevel > 2
  ) {
    recommendations.push("High vibration detected. Inspect engine mounts, wheels, and suspension components.");
  }

  if (errorCodes !== null && errorCodes > 0) {
    recommendations.push(`Vehicle reports ${errorCodes} active error code(s). Run diagnostic scan and clear root causes.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("All monitored telemetry parameters are within expected ranges. Continue routine maintenance.");
  }

  const diagnosticAnalysis =
    outOfRangeDetails.length > 0
      ? `Warning: ${outOfRangeDetails.length} parameter(s) out of safe range:\n${outOfRangeDetails
          .map((detail) => `- ${detail}`)
          .join("\n")}`
      : "All parameters within safe operating range.";

  return {
    healthScore,
    status,
    riskLevel,
    failureProbability: Number(failureProbability.toFixed(3)),
    confidenceScore: Number(confidenceScore.toFixed(3)),
    predictedFailureDays,
    modelVersion: "vehixa-rule-engine-v1",
    diagnosticAnalysis,
    topInfluentialFeatures,
    outOfRangeDetails,
    components,
    recommendations,
  };
};

module.exports = {
  evaluateTelemetry,
  toVehicleStatus,
};
