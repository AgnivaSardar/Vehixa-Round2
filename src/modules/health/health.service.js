const { prisma } = require("../../config/db");
const { evaluateTelemetry } = require("./health.scoring");

const toPredictionStatus = (status) => {
  if (status === "CRITICAL") return "CRITICAL";
  if (status === "WARNING") return "WARNING";
  return "HEALTHY";
};

const toRecommendationPriority = (riskLevel) => {
  if (riskLevel === "SEVERE") return "CRITICAL";
  if (riskLevel === "HIGH") return "HIGH";
  if (riskLevel === "MODERATE") return "MEDIUM";
  return "LOW";
};

const toAlertSeverity = (riskLevel) => {
  if (riskLevel === "SEVERE") return "CRITICAL";
  if (riskLevel === "HIGH") return "HIGH";
  if (riskLevel === "MODERATE") return "MEDIUM";
  return "LOW";
};

const mapPrediction = (prediction) => {
  const telemetrySource = prediction.telemetry?.source;
  const source = telemetrySource === null || telemetrySource === undefined
    ? null
    : String(telemetrySource);

  return {
    predictionId: prediction.predictionId,
    vehicleId: prediction.vehicleId,
    vehicleName: prediction.vehicle
      ? `${prediction.vehicle.manufacturer || "Unknown"} ${prediction.vehicle.model || "Vehicle"}`
      : "Unknown Vehicle",
    vehiclePlate: prediction.vehicle?.vehicleNumber || "N/A",
    telemetryId: prediction.telemetryId,
    overallHealth: prediction.healthScore,
    status: prediction.status,
    riskLevel: prediction.riskLevel,
    failureProbability: prediction.failureProbability,
    confidenceScore: prediction.confidenceScore,
    predictedFailureDays: prediction.predictedFailureDays,
    modelVersion: prediction.modelVersion,
    diagnosticAnalysis: prediction.diagnosticAnalysis,
    topInfluentialFeatures: prediction.topInfluentialFeatures || [],
    components: evaluateTelemetry(prediction.telemetry).components,
    recommendations: (prediction.recommendations || [])
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((item) => item.description || item.title)
      .filter(Boolean),
    source,
    recordedAt: prediction.telemetry?.recordedAt || null,
    evaluatedAt: prediction.createdAt,
  };
};

const healthService = {
  async list({ vehicleId, limit = 50 } = {}) {
    const take = Number.isFinite(Number(limit)) && Number(limit) > 0
      ? Math.min(Number(limit), 200)
      : 50;

    const predictions = await prisma.healthPrediction.findMany({
      where: vehicleId ? { vehicleId } : undefined,
      include: {
        vehicle: {
          select: {
            vehicleId: true,
            manufacturer: true,
            model: true,
            vehicleNumber: true,
          },
        },
        telemetry: true,
        recommendations: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
    });

    return predictions.map(mapPrediction);
  },

  async getById(predictionId) {
    const prediction = await prisma.healthPrediction.findUnique({
      where: { predictionId },
      include: {
        vehicle: {
          select: {
            vehicleId: true,
            manufacturer: true,
            model: true,
            vehicleNumber: true,
          },
        },
        telemetry: true,
        recommendations: true,
      },
    });

    if (!prediction) {
      return null;
    }

    return mapPrediction(prediction);
  },

  async evaluateLive(vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { vehicleId },
      select: {
        vehicleId: true,
        manufacturer: true,
        model: true,
        vehicleNumber: true,
      },
    });

    if (!vehicle) {
      const error = new Error("Vehicle not found");
      error.statusCode = 404;
      throw error;
    }

    const latestTelemetry2 = await prisma.telemtery2.findFirst({
      where: { vehicleId },
      orderBy: { recordedAt: "desc" },
    });

    if (!latestTelemetry2) {
      const error = new Error("No live telemetry found for selected vehicle");
      error.statusCode = 400;
      throw error;
    }

    const evaluation = evaluateTelemetry(latestTelemetry2);

    const source = latestTelemetry2.source || "API_PUSH";

    const telemetrySnapshot = await prisma.telemetry.create({
      data: {
        vehicleId,
        source,
        engineTemp: latestTelemetry2.engineTemp ?? latestTelemetry2.lubOilTemp ?? null,
        batteryVoltage: latestTelemetry2.batteryVoltage ?? null,
        rpm:
          latestTelemetry2.rpm !== null && latestTelemetry2.rpm !== undefined
            ? Math.round(Number(latestTelemetry2.rpm))
            : latestTelemetry2.engineRpm !== null && latestTelemetry2.engineRpm !== undefined
            ? Math.round(Number(latestTelemetry2.engineRpm))
            : null,
        oilPressure: latestTelemetry2.oilPressure ?? latestTelemetry2.lubOilPressure ?? null,
        mileage: latestTelemetry2.mileage ?? null,
        vibrationLevel: latestTelemetry2.vibrationLevel ?? null,
        fuelEfficiency: latestTelemetry2.fuelEfficiency ?? null,
        errorCodesCount: latestTelemetry2.errorCodesCount ?? 0,
        ambientTemperature: latestTelemetry2.ambientTemperature ?? null,
        coolantLevel: latestTelemetry2.coolantLevel ?? latestTelemetry2.coolantPressure ?? null,
        recordedAt: latestTelemetry2.recordedAt || new Date(),
      },
    });

    const prediction = await prisma.healthPrediction.create({
      data: {
        vehicleId,
        telemetryId: telemetrySnapshot.telemetryId,
        healthScore: evaluation.healthScore,
        status: toPredictionStatus(evaluation.status),
        failureProbability: evaluation.failureProbability,
        riskLevel: evaluation.riskLevel,
        predictedFailureDays: evaluation.predictedFailureDays,
        confidenceScore: evaluation.confidenceScore,
        modelVersion: evaluation.modelVersion,
        diagnosticAnalysis: evaluation.diagnosticAnalysis,
        topInfluentialFeatures: evaluation.topInfluentialFeatures || [],
      },
    });

    if (evaluation.recommendations.length > 0) {
      await prisma.recommendation.createMany({
        data: evaluation.recommendations.map((text) => ({
          predictionId: prediction.predictionId,
          title: text.substring(0, 80),
          description: text,
          priority: toRecommendationPriority(evaluation.riskLevel),
          actionType: "INSPECT",
          actionDueDays: evaluation.predictedFailureDays,
        })),
      });
    }

    let createdAlert = null;
    if (evaluation.status === "CRITICAL" || evaluation.failureProbability >= 0.7) {
      createdAlert = await prisma.alert.create({
        data: {
          vehicleId,
          predictionId: prediction.predictionId,
          alertType: "LIVE_EVALUATION",
          severity: toAlertSeverity(evaluation.riskLevel),
          title: "LIVE_EVALUATION_CRITICAL",
          message: `Live evaluation marked vehicle as critical (health ${evaluation.healthScore}%). Immediate inspection required.`,
        },
      });
    } else if (evaluation.status === "WARNING" || evaluation.failureProbability >= 0.4) {
      createdAlert = await prisma.alert.create({
        data: {
          vehicleId,
          predictionId: prediction.predictionId,
          alertType: "LIVE_EVALUATION",
          severity: toAlertSeverity(evaluation.riskLevel),
          title: "LIVE_EVALUATION_WARNING",
          message: `Live evaluation detected moderate risk (health ${evaluation.healthScore}%). Schedule maintenance check.`,
        },
      });
    }

    return {
      predictionId: prediction.predictionId,
      telemetryId: telemetrySnapshot.telemetryId,
      vehicleId,
      vehicleName: `${vehicle.manufacturer || "Unknown"} ${vehicle.model || "Vehicle"}`,
      vehiclePlate: vehicle.vehicleNumber || "N/A",
      overallHealth: evaluation.healthScore,
      status: evaluation.status,
      riskLevel: evaluation.riskLevel,
      failureProbability: evaluation.failureProbability,
      confidenceScore: evaluation.confidenceScore,
      predictedFailureDays: evaluation.predictedFailureDays,
      modelVersion: evaluation.modelVersion,
      diagnosticAnalysis: evaluation.diagnosticAnalysis,
      topInfluentialFeatures: evaluation.topInfluentialFeatures,
      components: evaluation.components,
      recommendations: evaluation.recommendations,
      source,
      telemetryRecordedAt: latestTelemetry2.recordedAt,
      evaluatedAt: prediction.createdAt,
      alert: createdAlert
        ? {
            alertId: createdAlert.alertId,
            alertType: createdAlert.alertType,
            severity: createdAlert.severity,
            title: createdAlert.title,
            message: createdAlert.message,
          }
        : null,
    };
  },
};

module.exports = { healthService };
