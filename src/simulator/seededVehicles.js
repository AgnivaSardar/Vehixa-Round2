const { prisma } = require("../config/db");

const DEFAULT_SEEDED_VEHICLE_NUMBERS = [
  "MH-12-AB-1234",
  "MH-12-CD-5678",
  "GJ-01-EF-9012",
  "DL-3C-GH-3456",
  "KA-05-IJ-7890",
];

const parseCsvList = (value) => {
  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const vehicleSelect = {
  vehicleId: true,
  vehicleNumber: true,
  manufacturer: true,
  model: true,
  year: true,
  status: true,
};

const loadByVehicleIds = async (vehicleIds) => {
  if (!vehicleIds.length) return [];

  return prisma.vehicle.findMany({
    where: {
      vehicleId: { in: vehicleIds },
    },
    select: vehicleSelect,
  });
};

const loadByVehicleNumbers = async (vehicleNumbers) => {
  if (!vehicleNumbers.length) return [];

  return prisma.vehicle.findMany({
    where: {
      vehicleNumber: { in: vehicleNumbers },
    },
    select: vehicleSelect,
    orderBy: [{ vehicleNumber: "asc" }],
  });
};

const loadFallbackVehicles = async () => {
  return prisma.vehicle.findMany({
    where: {
      status: {
        in: ["ACTIVE", "UNDER_MAINTENANCE", "INACTIVE"],
      },
    },
    select: vehicleSelect,
    take: 10,
    orderBy: [{ createdAt: "asc" }],
  });
};

async function resolveSimulatorVehicles(options = {}) {
  const explicitVehicleIds = unique([
    ...(Array.isArray(options.vehicleIds) ? options.vehicleIds : []),
    ...parseCsvList(process.env.SIMULATOR_VEHICLE_IDS),
  ]);

  const explicitVehicleId =
    (typeof options.vehicleId === "string" && options.vehicleId.trim()) ||
    (typeof process.env.SIMULATOR_VEHICLE_ID === "string" &&
      process.env.SIMULATOR_VEHICLE_ID.trim()) ||
    "";

  const explicitVehicleNumbers = unique([
    ...(Array.isArray(options.vehicleNumbers) ? options.vehicleNumbers : []),
    ...parseCsvList(process.env.SIMULATOR_VEHICLE_NUMBERS),
  ]);

  if (explicitVehicleIds.length > 0) {
    const vehicles = await loadByVehicleIds(explicitVehicleIds);
    if (vehicles.length > 0) {
      return {
        vehicles,
        defaultVehicleId: vehicles[0].vehicleId,
        source: "SIMULATOR_VEHICLE_IDS",
      };
    }
  }

  if (explicitVehicleId) {
    const vehicles = await loadByVehicleIds([explicitVehicleId]);
    if (vehicles.length > 0) {
      return {
        vehicles,
        defaultVehicleId: vehicles[0].vehicleId,
        source: "SIMULATOR_VEHICLE_ID",
      };
    }
  }

  const preferredVehicleNumbers =
    explicitVehicleNumbers.length > 0
      ? explicitVehicleNumbers
      : DEFAULT_SEEDED_VEHICLE_NUMBERS;

  const seededVehicles = await loadByVehicleNumbers(preferredVehicleNumbers);
  if (seededVehicles.length > 0) {
    return {
      vehicles: seededVehicles,
      defaultVehicleId: seededVehicles[0].vehicleId,
      source:
        explicitVehicleNumbers.length > 0
          ? "SIMULATOR_VEHICLE_NUMBERS"
          : "seeded-defaults",
    };
  }

  const fallbackVehicles = await loadFallbackVehicles();
  if (fallbackVehicles.length > 0) {
    return {
      vehicles: fallbackVehicles,
      defaultVehicleId: fallbackVehicles[0].vehicleId,
      source: "fallback-db-vehicles",
    };
  }

  throw new Error(
    "No vehicles found for simulator. Seed data first with `npm run db:seed` or create vehicles."
  );
}

module.exports = {
  resolveSimulatorVehicles,
  DEFAULT_SEEDED_VEHICLE_NUMBERS,
};
