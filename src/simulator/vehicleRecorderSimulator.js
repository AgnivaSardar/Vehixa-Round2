const { env } = require("../config/env");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomInRange = (min, max) => min + Math.random() * (max - min);

const makeVehicleReading = () => ({
  engine_rpm: Number(randomInRange(850, 2300).toFixed(2)),
  lub_oil_pressure: Number(randomInRange(1.4, 4.8).toFixed(2)),
  fuel_pressure: Number(randomInRange(9.5, 24.5).toFixed(2)),
  coolant_pressure: Number(randomInRange(0.8, 5.2).toFixed(2)),
  lub_oil_temp: Number(randomInRange(70, 118).toFixed(2)),
  coolant_temp: Number(randomInRange(75, 108).toFixed(2)),
  recordedAt: new Date().toISOString(),
});

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
    process.env.SIMULATOR_TARGET_URL || `http://localhost:${env.PORT}${env.API_PREFIX}/telemetry`;
  const vehicleId = process.env.SIMULATOR_VEHICLE_ID || "vehicle-real-time-001";
  const minIntervalSeconds = toPositiveNumber(process.env.SIMULATOR_MIN_INTERVAL_SECONDS, 20);
  const maxIntervalSeconds = toPositiveNumber(process.env.SIMULATOR_MAX_INTERVAL_SECONDS, 30);

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║      🚗 ROUND2 REAL-TIME VEHICLE SIMULATOR                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\n📡 Target URL: ${targetUrl}`);
  console.log(`🚙 Vehicle ID: ${vehicleId}`);
  console.log(`⏱️  Send Interval: ${minIntervalSeconds}-${maxIntervalSeconds}s (randomized)`);
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
    const sendIntervalSeconds = getRandomIntervalSeconds(minIntervalSeconds, maxIntervalSeconds);
    const sendIntervalMs = sendIntervalSeconds * 1000;
    const startTime = Date.now();
    readingIndex += 1;

    const reading = makeVehicleReading();
    const payload = {
      vehicleId,
      source: "REAL_TIME_STREAM",
      ...reading,
    };

    try {
      await postTelemetry(targetUrl, payload);

      console.log(
        `[${toDateString(new Date())}] ✅ Reading #${readingIndex} sent | RPM: ${reading.engine_rpm} | Oil: ${reading.lub_oil_pressure} bar | Coolant: ${reading.coolant_temp}°C`
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

      for (let step = 0; step < progressSteps && !shouldStop; step += 1) {
        const progressMs = Math.min(updateInterval, remaining - step * updateInterval);
        const percentComplete = ((sendIntervalMs - remaining + step * updateInterval) / sendIntervalMs) * 100;
        const bar = displayProgressBar(Math.min(100, percentComplete));

        process.stdout.write(
          `\r⏳ Next reading in ${((remaining - step * updateInterval) / 1000).toFixed(1)}s ${bar}`
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
