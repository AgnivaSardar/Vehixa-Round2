const { env } = require("../config/env");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomInRange = (min, max) => min + Math.random() * (max - min);

const makeVehicleReading = () => {
  const engineRpm = Number(randomInRange(850, 2300).toFixed(2));
  const speed = Number(randomInRange(20, 120).toFixed(2));

  return {
    engineRpm: engineRpm,
    rpm: engineRpm,

    lubOilPressure: Number(randomInRange(1.4, 4.8).toFixed(2)),
    oilPressure: Number(randomInRange(1.4, 4.8).toFixed(2)),

    fuelPressure: Number(randomInRange(9.5, 24.5).toFixed(2)),
    coolantPressure: Number(randomInRange(0.8, 5.2).toFixed(2)),

    lubOilTemp: Number(randomInRange(70, 118).toFixed(2)),
    coolantTemp: Number(randomInRange(75, 108).toFixed(2)),
    engineTemp: Number(randomInRange(75, 115).toFixed(2)),

    batteryVoltage: Number(randomInRange(11.8, 14.2).toFixed(2)),

    speed: speed,
    mileage: Number(randomInRange(10000, 200000).toFixed(2)),
    vibrationLevel: Number(randomInRange(0.1, 2.5).toFixed(2)),

    fuelEfficiency: Number(randomInRange(8, 20).toFixed(2)),

    errorCodesCount: Math.floor(randomInRange(0, 3)),

    coolantLevel: Number(randomInRange(50, 100).toFixed(2)),

    ambientTemperature: Number(randomInRange(25, 40).toFixed(2)),

    recordedAt: new Date().toISOString(),
  };
};

const postTelemetry = async (targetUrl, payload) => {
  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`POST ${targetUrl} failed (${response.status}): ${body}`);
  }

  return response.json();
};

const toPositiveNumber = (value, fallbackValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
};

const toDateString = (date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

const getRandomIntervalSeconds = (min, max) => {
  return Math.floor(randomInRange(min, max));
};

const displayProgressBar = (percent) => {
  const filled = Math.round(20 * (percent / 100));
  const empty = 20 - filled;
  return "[" + "█".repeat(filled) + "░".repeat(empty) + "]";
};

const runContinuousSimulator = async () => {
  const targetUrl =
    process.env.SIMULATOR_TARGET_URL ||
    "https://vehixa-round2.onrender.com/api/v1/telemetry";

  const vehicleId =
    process.env.SIMULATOR_VEHICLE_ID || "81609e52-0b40-4b54-a891-2b0adb813c7b"; // Honda City

  const minIntervalSeconds = toPositiveNumber(
    process.env.SIMULATOR_MIN_INTERVAL_SECONDS,
    20
  );

  const maxIntervalSeconds = toPositiveNumber(
    process.env.SIMULATOR_MAX_INTERVAL_SECONDS,
    30
  );

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║      🚗 ROUND2 REAL-TIME VEHICLE SIMULATOR                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  console.log(`\n📡 Target URL: ${targetUrl}`);
  console.log(`🚙 Vehicle ID: ${vehicleId}`);
  console.log(
    `⏱️  Send Interval: ${minIntervalSeconds}-${maxIntervalSeconds}s`
  );

  console.log(`\n⏳ Simulator running... Press Ctrl+C to stop.\n`);

  let readingIndex = 0;
  let shouldStop = false;

  const stopHandler = () => {
    console.log("\n\n[simulator] Stopping...");
    shouldStop = true;
  };

  process.on("SIGINT", stopHandler);
  process.on("SIGTERM", stopHandler);

  while (!shouldStop) {
    const sendIntervalSeconds = getRandomIntervalSeconds(
      minIntervalSeconds,
      maxIntervalSeconds
    );

    const sendIntervalMs = sendIntervalSeconds * 1000;
    const startTime = Date.now();

    readingIndex += 1;

    const reading = makeVehicleReading();

    const payload = {
      vehicleId,
      source: "SIMULATOR",
      ...reading,
      rawPayload: reading,
    };

    try {
      await postTelemetry(targetUrl, payload);

      console.log(
        `[${toDateString(new Date())}] ✅ Reading #${readingIndex} sent | RPM: ${
          reading.engineRpm
        } | Temp: ${reading.coolantTemp}°C | FuelEff: ${
          reading.fuelEfficiency
        }`
      );
    } catch (error) {
      console.log(
        `[${toDateString(new Date())}] ❌ Reading #${readingIndex} failed | ${error.message}`
      );
    }

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, sendIntervalMs - elapsed);

    if (remaining > 0 && !shouldStop) {
      const updateInterval = 500;
      const progressSteps = Math.ceil(remaining / updateInterval);

      for (let step = 0; step < progressSteps && !shouldStop; step++) {
        const progressMs = Math.min(
          updateInterval,
          remaining - step * updateInterval
        );

        const percentComplete =
          ((sendIntervalMs - remaining + step * updateInterval) /
            sendIntervalMs) *
          100;

        const bar = displayProgressBar(Math.min(100, percentComplete));

        process.stdout.write(
          `\r⏳ Next reading in ${(
            (remaining - step * updateInterval) /
            1000
          ).toFixed(1)}s ${bar}`
        );

        await sleep(progressMs);
      }

      process.stdout.write("\r" + " ".repeat(70) + "\r");
    }
  }

  process.removeListener("SIGINT", stopHandler);
  process.removeListener("SIGTERM", stopHandler);

  console.log("✋ Simulator stopped.\n");
};

runContinuousSimulator().catch((error) => {
  console.error("[simulator] Fatal error:", error.message);
  process.exit(1);
});