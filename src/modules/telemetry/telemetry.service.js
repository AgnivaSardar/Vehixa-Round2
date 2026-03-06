const { prisma } = require("../../config/db");

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

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
  return Number.isInteger(numericValue)
    ? numericValue
    : Math.round(numericValue);
};

const normalizePayload = (payload) => {
  const vehicleId =
    typeof payload.vehicleId === "string" ? payload.vehicleId.trim() : "";

  if (!vehicleId) {
    return { error: "vehicleId is required" };
  }

  const recordedAtInput = payload.recordedAt
    ? new Date(payload.recordedAt)
    : new Date();

  const recordedAt = Number.isNaN(recordedAtInput.getTime())
    ? new Date()
    : recordedAtInput;

  // Core metrics
  const engineRpm = toNumber(
    firstDefined(payload.engine_rpm, payload.engineRpm, payload.rpm)
  );

  const lubOilPressure = toNumber(
    firstDefined(
      payload.lub_oil_pressure,
      payload.lubOilPressure,
      payload.oilPressure
    )
  );

  const fuelPressure = toNumber(
    firstDefined(payload.fuel_pressure, payload.fuelPressure)
  );

  const coolantPressure = toNumber(
    firstDefined(payload.coolant_pressure, payload.coolantPressure)
  );

  const lubOilTemp = toNumber(
    firstDefined(payload.lub_oil_temp, payload.lubOilTemp)
  );

  const coolantTemp = toNumber(
    firstDefined(payload.coolant_temp, payload.coolantTemp)
  );

  return {
    data: {
      vehicleId,

      source:
        typeof payload.source === "string" && payload.source.trim()
          ? payload.source.trim()
          : "EDGE_INPUT",

      engineRpm,
      lubOilPressure,
      fuelPressure,
      coolantPressure,
      lubOilTemp,
      coolantTemp,

      engineTemp: toNumber(
        firstDefined(payload.engine_temp, payload.engineTemp, lubOilTemp)
      ),

      rpm: toNumber(firstDefined(payload.rpm, engineRpm)),

      batteryVoltage: toNumber(
        firstDefined(payload.battery_voltage, payload.batteryVoltage)
      ),

      oilPressure: toNumber(
        firstDefined(payload.oil_pressure, payload.oilPressure, lubOilPressure)
      ),

      mileage: toNumber(payload.mileage),

      vibrationLevel: toNumber(
        firstDefined(payload.vibration_level, payload.vibrationLevel)
      ),

      fuelEfficiency: toNumber(
        firstDefined(payload.fuel_efficiency, payload.fuelEfficiency)
      ),

      errorCodesCount: toInteger(
        firstDefined(payload.error_codes_count, payload.errorCodesCount)
      ),

      coolantLevel: toNumber(
        firstDefined(payload.coolant_level, payload.coolantLevel)
      ),

      ambientTemperature: toNumber(
        firstDefined(payload.ambient_temperature, payload.ambientTemperature)
      ),

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

    const telemetry = await prisma.telemtery2.create({
      data: normalized.data,
    });

    return telemetry;
  },

  async list(options = {}) {
    const limitInput = Number(options.limit);

    const take =
      Number.isFinite(limitInput) && limitInput > 0
        ? Math.min(limitInput, 500)
        : 50;

    return prisma.telemtery2.findMany({
      where: options.vehicleId ? { vehicleId: options.vehicleId } : undefined,
      orderBy: { receivedAt: "desc" },
      take,
    });
  },

  async latest(vehicleId) {
    return prisma.telemtery2.findFirst({
      where: vehicleId ? { vehicleId } : undefined,
      orderBy: { receivedAt: "desc" },
    });
  },
};

module.exports = { telemetryService };