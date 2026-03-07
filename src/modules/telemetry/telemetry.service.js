const { prisma } = require("../../config/db");
const { runFaultEngine } = require("../../../services/faultEngine");

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toInteger = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : Math.round(n);
};

function getSeverity(alertCode) {
  if (alertCode.includes("CRITICAL")) return "CRITICAL";
  if (alertCode.includes("WARNING")) return "HIGH";
  return "MEDIUM";
}

const normalizePayload = (payload) => {
  const vehicleId =
    typeof payload.vehicleId === "string" ? payload.vehicleId.trim() : "";

  const nestedPayload =
    payload.rawPayload && typeof payload.rawPayload === "object"
      ? payload.rawPayload
      : null;

  if (!vehicleId) return { error: "vehicleId is required" };

  const recordedAtInput = payload.recordedAt
    ? new Date(payload.recordedAt)
    : new Date();

  const recordedAt = Number.isNaN(recordedAtInput.getTime())
    ? new Date()
    : recordedAtInput;

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
        typeof firstDefined(payload.source, nestedPayload?.source) === "string" &&
        firstDefined(payload.source, nestedPayload?.source).trim()
          ? firstDefined(payload.source, nestedPayload?.source).trim()
          : "API_PUSH",

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

      activeFaultCodes: firstDefined(
        payload.active_fault_codes,
        payload.activeFaultCodes,
        nestedPayload?.active_fault_codes,
        nestedPayload?.activeFaultCodes
      ),

      batteryStateOfCharge: toNumber(
        firstDefined(
          payload.battery_state_of_charge,
          payload.batteryStateOfCharge,
          payload.soc,
          nestedPayload?.battery_state_of_charge,
          nestedPayload?.batteryStateOfCharge,
          nestedPayload?.soc
        )
      ),

      batteryTemp: toNumber(
        firstDefined(
          payload.battery_temp,
          payload.batteryTemp,
          nestedPayload?.battery_temp,
          nestedPayload?.batteryTemp
        )
      ),

      engineLoad: toNumber(
        firstDefined(
          payload.engine_load,
          payload.engineLoad,
          nestedPayload?.engine_load,
          nestedPayload?.engineLoad
        )
      ),

      inverterTemp: toNumber(
        firstDefined(
          payload.inverter_temp,
          payload.inverterTemp,
          nestedPayload?.inverter_temp,
          nestedPayload?.inverterTemp
        )
      ),

      motorTemp: toNumber(
        firstDefined(
          payload.motor_temp,
          payload.motorTemp,
          nestedPayload?.motor_temp,
          nestedPayload?.motorTemp
        )
      ),

      speed: toNumber(
        firstDefined(
          payload.speed,
          payload.vehicle_speed,
          payload.vehicleSpeed,
          nestedPayload?.speed,
          nestedPayload?.vehicle_speed,
          nestedPayload?.vehicleSpeed
        )
      ),

      throttlePosition: toNumber(
        firstDefined(
          payload.throttle_position,
          payload.throttlePosition,
          nestedPayload?.throttle_position,
          nestedPayload?.throttlePosition
        )
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
      const err = new Error(normalized.error);
      err.statusCode = 400;
      throw err;
    }

    const telemetry = await prisma.telemtery2.create({
      data: normalized.data,
    });

    const faultResult = await runFaultEngine(prisma, telemetry);

    const createdAlerts = [];

    // METRIC ALERTS
    for (const alertCode of faultResult.metricAlerts || []) {

      const existing = await prisma.alert.findFirst({
        where: {
          vehicleId: telemetry.vehicleId,
          title: alertCode,
          isResolved: false,
        },
      });

      if (!existing) {
        const alert = await prisma.alert.create({
          data: {
            vehicleId: telemetry.vehicleId,
            severity: getSeverity(alertCode),
            title: alertCode,
            message: `Metric alert detected: ${alertCode}`,
            predictionId: null,
          },
        });

        createdAlerts.push(alert);
      }
    }

    // SYSTEM FAULT
    if (faultResult.systemFault) {

      const existing = await prisma.alert.findFirst({
        where: {
          vehicleId: telemetry.vehicleId,
          title: faultResult.systemFault,
          isResolved: false,
        },
      });

      if (!existing) {
        const alert = await prisma.alert.create({
          data: {
            vehicleId: telemetry.vehicleId,
            severity: faultResult.severity || "CRITICAL",
            title: faultResult.systemFault,
            message: `System fault detected: ${faultResult.systemFault}`,
            predictionId: null,
          },
        });

        createdAlerts.push(alert);
      }
    }

    return {
      telemetry,
      metricAlerts: faultResult.metricAlerts,
      systemFault: faultResult.systemFault,
      alertsCreated: createdAlerts.length,
    };
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