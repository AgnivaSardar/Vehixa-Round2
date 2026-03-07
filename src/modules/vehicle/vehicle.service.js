const { prisma } = require("../../config/db");
const { evaluateTelemetry, toVehicleStatus } = require("../health/health.scoring");

const FUEL_TYPES = new Set([
  "PETROL",
  "DIESEL",
  "ELECTRIC",
  "HYBRID",
  "PLUG_IN_HYBRID",
  "CNG",
  "LPG",
  "HYDROGEN",
]);

const ENGINE_TYPES = new Set([
  "INLINE",
  "V_TYPE",
  "BOXER",
  "ROTARY",
  "ELECTRIC_MOTOR",
]);

const VEHICLE_TYPES = new Set([
  "SEDAN",
  "HATCHBACK",
  "SUV",
  "COUPE",
  "CONVERTIBLE",
  "WAGON",
  "MINIVAN",
  "MOTORCYCLE",
  "SCOOTER",
  "PICKUP_TRUCK",
  "LIGHT_TRUCK",
  "HEAVY_TRUCK",
  "TRAILER",
  "BUS",
  "SCHOOL_BUS",
  "DELIVERY_VAN",
  "ELECTRIC",
  "HYBRID",
  "PLUG_IN_HYBRID",
  "CONSTRUCTION",
  "AGRICULTURAL",
  "EMERGENCY",
  "MILITARY",
  "FLEET_VEHICLE",
]);

const VEHICLE_STATUSES = new Set([
  "ACTIVE",
  "INACTIVE",
  "UNDER_MAINTENANCE",
  "DECOMMISSIONED",
]);

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const optionalString = (value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeEnumValue = (value) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return normalized.length > 0 ? normalized : undefined;
};

const parseOptionalYear = (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1980 || parsed > 2100) {
    throw badRequest("year must be an integer between 1980 and 2100");
  }

  return parsed;
};

const parseOptionalDate = (value) => {
  const dateValue = optionalString(value);
  if (!dateValue) return undefined;

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest("registrationDate must be a valid date string");
  }

  return parsed;
};

const toVehicleViewModel = async (
  vehicle,
  includeAlertCount = false,
  preloadedLatestTelemetry
) => {
  let latestTelemetry = preloadedLatestTelemetry;

  if (latestTelemetry === undefined) {
    latestTelemetry = await prisma.telemtery2.findFirst({
      where: { vehicleId: vehicle.vehicleId },
      orderBy: { recordedAt: "desc" },
    });
  }

  const evaluation = evaluateTelemetry(latestTelemetry);

  return {
    id: vehicle.vehicleId,
    vehicleId: vehicle.vehicleId,
    userId: vehicle.userId,
    name: `${vehicle.manufacturer || "Unknown"} ${vehicle.model || "Vehicle"}`,
    plate: vehicle.vehicleNumber || "N/A",
    type: vehicle.vehicleType || "UNKNOWN",
    healthScore: Math.round(evaluation.healthScore),
    status: toVehicleStatus(evaluation.status),
    lastUpdate: latestTelemetry?.recordedAt || vehicle.updatedAt,
    driver: vehicle.user?.name || "Unassigned",
    mileage: latestTelemetry?.mileage || 0,
    activeAlerts: includeAlertCount ? vehicle._count?.alerts || 0 : undefined,
    manufacturer: vehicle.manufacturer,
    model: vehicle.model,
    year: vehicle.year,
    vin: vehicle.vin,
    fuelType: vehicle.fuelType,
    latestTelemetry,
  };
};

const vehicleService = {
  async create(payload = {}) {
    const fuelType = normalizeEnumValue(payload.fuelType);
    if (!fuelType || !FUEL_TYPES.has(fuelType)) {
      throw badRequest(`fuelType is required and must be one of: ${[...FUEL_TYPES].join(", ")}`);
    }

    const engineType = normalizeEnumValue(payload.engineType);
    if (engineType && !ENGINE_TYPES.has(engineType)) {
      throw badRequest(`engineType must be one of: ${[...ENGINE_TYPES].join(", ")}`);
    }

    const vehicleType = normalizeEnumValue(payload.vehicleType);
    if (vehicleType && !VEHICLE_TYPES.has(vehicleType)) {
      throw badRequest(`vehicleType must be one of: ${[...VEHICLE_TYPES].join(", ")}`);
    }

    const status = normalizeEnumValue(payload.status);
    if (status && !VEHICLE_STATUSES.has(status)) {
      throw badRequest(`status must be one of: ${[...VEHICLE_STATUSES].join(", ")}`);
    }

    let userId = optionalString(payload.userId);
    if (!userId) {
      const fallbackUser = await prisma.user.findFirst({
        select: { userId: true },
        orderBy: { createdAt: "asc" },
      });

      if (!fallbackUser) {
        throw badRequest("No users available to assign this vehicle. Please provide a valid userId.");
      }

      userId = fallbackUser.userId;
    }

    const user = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (!user) {
      throw badRequest("Provided userId does not exist");
    }

    let createdVehicle;

    try {
      createdVehicle = await prisma.vehicle.create({
        data: {
          userId,
          vehicleNumber: optionalString(payload.vehicleNumber),
          model: optionalString(payload.model),
          manufacturer: optionalString(payload.manufacturer),
          year: parseOptionalYear(payload.year),
          vehicleType,
          vin: optionalString(payload.vin),
          engineType,
          fuelType,
          registrationDate: parseOptionalDate(payload.registrationDate),
          status,
        },
      });
    } catch (error) {
      if (error?.code === "P2002") {
        throw badRequest("vehicleNumber or vin already exists");
      }

      throw error;
    }

    return this.getById(createdVehicle.vehicleId);
  },

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
        telemetry2: {
          orderBy: {
            recordedAt: "desc",
          },
          take: 1,
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
      vehicles.map((vehicle) =>
        toVehicleViewModel(vehicle, true, vehicle.telemetry2?.[0] ?? null)
      )
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
        telemetry2: {
          orderBy: {
            recordedAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!vehicle) {
      return null;
    }

    return toVehicleViewModel(vehicle, false, vehicle.telemetry2?.[0] ?? null);
  },
};

module.exports = { vehicleService };
