const { prisma } = require("../../config/db");

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const toInteger = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? numericValue : Math.round(numericValue);
};

const normalizePayload = (payload) => {
  const vehicleId = typeof payload.vehicleId === "string" ? payload.vehicleId.trim() : "";

  if (!vehicleId) {
    return { error: "vehicleId is required" };
  }

  const recordedAtInput = payload.recordedAt ? new Date(payload.recordedAt) : new Date();
  const recordedAt = Number.isNaN(recordedAtInput.getTime()) ? new Date() : recordedAtInput;

  const engineRpm = toNumber(firstDefined(payload.engine_rpm, payload.engineRpm, payload.rpm));
  const lubOilPressure = toNumber(firstDefined(payload.lub_oil_pressure, payload.lubOilPressure, payload.oilPressure));
  const fuelPressure = toNumber(firstDefined(payload.fuel_pressure, payload.fuelPressure));
  const coolantPressure = toNumber(firstDefined(payload.coolant_pressure, payload.coolantPressure));
  const lubOilTemp = toNumber(firstDefined(payload.lub_oil_temp, payload.lubOilTemp));
  const coolantTemp = toNumber(firstDefined(payload.coolant_temp, payload.coolantTemp));

  return {
    data: {
      vehicleId,
      source: typeof payload.source === "string" && payload.source.trim() ? payload.source.trim() : "EDGE_INPUT",
      engineRpm,
      lubOilPressure,
      fuelPressure,
      coolantPressure,
      lubOilTemp,
      coolantTemp,
      engineTemp: toNumber(firstDefined(payload.engineTemp, lubOilTemp)),
      rpm: toNumber(firstDefined(payload.rpm, engineRpm)),
      batteryVoltage: toNumber(payload.batteryVoltage),
      oilPressure: toNumber(firstDefined(payload.oilPressure, lubOilPressure)),
      mileage: toNumber(payload.mileage),
      vibrationLevel: toNumber(payload.vibrationLevel),
      fuelEfficiency: toNumber(payload.fuelEfficiency),
      errorCodesCount: toInteger(payload.errorCodesCount),
      coolantLevel: toNumber(payload.coolantLevel),
      ambientTemperature: toNumber(payload.ambientTemperature),
      recordedAt,
      rawPayload: payload,
    },
  };
};

const telemetryService = {
  async ingest(payload) {
    const normalized = normalizePayload(payload);

    if (normalized.error) {
      const error = new Error(normalized.error);
      error.statusCode = 400;
      throw error;
    }

    const telemetry = await prisma.telemetry.create({
      data: normalized.data,
    });

    return telemetry;
  },

  async list(options = {}) {
    const limitInput = Number(options.limit);
    const take = Number.isFinite(limitInput) && limitInput > 0 ? Math.min(limitInput, 500) : 50;

    return prisma.telemetry.findMany({
      where: options.vehicleId ? { vehicleId: options.vehicleId } : undefined,
      orderBy: { receivedAt: "desc" },
      take,
    });
  },

  async latest(vehicleId) {
    return prisma.telemetry.findFirst({
      where: vehicleId ? { vehicleId } : undefined,
      orderBy: { receivedAt: "desc" },
    });
  },
};

module.exports = { telemetryService };
