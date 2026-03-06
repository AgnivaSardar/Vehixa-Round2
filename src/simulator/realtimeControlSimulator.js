const express = require("express");
const path = require("path");
const { env } = require("../config/env");

const app = express();
app.use(express.json());

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toPositiveInteger = (value, fallbackValue) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallbackValue;
};

const clampNumber = (value, fallbackValue, min, max, decimals = 2) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallbackValue;

  const clamped = Math.min(max, Math.max(min, parsed));
  return Number(clamped.toFixed(decimals));
};

const METRIC_RULES = {
  engineRpm: { min: 500, max: 6000 },
  lubOilPressure: { min: 0, max: 10 },
  fuelPressure: { min: 0, max: 40 },
  coolantPressure: { min: 0, max: 10 },

  lubOilTemp: { min: 40, max: 150 },
  coolantTemp: { min: 40, max: 130 },
  engineTemp: { min: 40, max: 140 },

  batteryVoltage: { min: 10, max: 16 },
  oilPressure: { min: 0, max: 10 },

  speed: { min: 0, max: 200 },
  mileage: { min: 0, max: 500000 },
  vibrationLevel: { min: 0, max: 10 },

  fuelEfficiency: { min: 0, max: 40 },
  coolantLevel: { min: 0, max: 100 },
  ambientTemperature: { min: -10, max: 60 },

  errorCodesCount: { min: 0, max: 10 },
};

const defaultTargetUrl =
  process.env.SIMULATOR_TARGET_URL ||
  "https://vehixa-round2.onrender.com/api/v1/telemetry";

const state = {
  targetUrl: defaultTargetUrl,
  vehicleId:
    process.env.SIMULATOR_CONTROL_VEHICLE_ID || "b7a09ab1-5c9b-4730-b988-09545e3fb45d", // Tesla Model S

  source: "SIMULATOR",

  minIntervalSeconds: 10,
  maxIntervalSeconds: 15,

  isActive: false,
  sentCount: 0,

  lastSentAt: null,
  lastResult: null,
  nextSendAt: null,

  metrics: {
    engineRpm: 1200,
    rpm: 1200,

    lubOilPressure: 2.8,
    oilPressure: 2.8,

    fuelPressure: 15.2,
    coolantPressure: 1.4,

    lubOilTemp: 84,
    coolantTemp: 90,
    engineTemp: 92,

    batteryVoltage: 13.2,

    speed: 60,
    mileage: 45000,
    vibrationLevel: 0.5,

    fuelEfficiency: 15,

    coolantLevel: 75,
    ambientTemperature: 30,

    errorCodesCount: 0,
  },
};

let loopPromise = null;

const getRandomIntervalSeconds = () => {
  const min = Math.min(state.minIntervalSeconds, state.maxIntervalSeconds);
  const max = Math.max(state.minIntervalSeconds, state.maxIntervalSeconds);

  return min + Math.floor(Math.random() * (max - min + 1));
};

const waitWithStopCheck = async (durationMs) => {
  let remaining = durationMs;

  while (remaining > 0) {
    if (!state.isActive) return false;

    const step = Math.min(250, remaining);
    await sleep(step);

    remaining -= step;
  }

  return state.isActive;
};

const postTelemetry = async () => {
  const payload = {
    vehicleId: state.vehicleId,
    source: state.source,

    ...state.metrics,

    recordedAt: new Date().toISOString(),
    rawPayload: state.metrics,
  };

  const response = await fetch(state.targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`POST ${state.targetUrl} failed (${response.status}): ${body}`);
  }

  return response.json();
};

const runLoop = async () => {
  if (loopPromise) return loopPromise;

  loopPromise = (async () => {
    while (state.isActive) {
      const intervalSeconds = getRandomIntervalSeconds();

      state.nextSendAt = Date.now() + intervalSeconds * 1000;

      const shouldContinue = await waitWithStopCheck(intervalSeconds * 1000);

      if (!shouldContinue) break;

      try {
        await postTelemetry();

        state.sentCount += 1;
        state.lastSentAt = new Date().toISOString();

        state.lastResult = {
          ok: true,
          message: "Telemetry sent",
          at: state.lastSentAt,
        };

        console.log(
          `[control-simulator] sent #${state.sentCount} | vehicle=${state.vehicleId} | rpm=${state.metrics.engineRpm}`
        );
      } catch (error) {
        state.lastResult = {
          ok: false,
          message: error.message,
          at: new Date().toISOString(),
        };

        console.error(`[control-simulator] ${error.message}`);
      }
    }

    state.nextSendAt = null;
    loopPromise = null;
  })();

  return loopPromise;
};

const serializeState = () => {
  const secondsUntilNextSend =
    state.nextSendAt === null
      ? null
      : Math.max(0, Math.ceil((state.nextSendAt - Date.now()) / 1000));

  return {
    ...state,
    secondsUntilNextSend,
  };
};

const applyMetricsPatch = (inputMetrics) => {
  if (!inputMetrics || typeof inputMetrics !== "object") return;

  for (const [metricName, rules] of Object.entries(METRIC_RULES)) {
    if (inputMetrics[metricName] !== undefined) {
      state.metrics[metricName] = clampNumber(
        inputMetrics[metricName],
        state.metrics[metricName],
        rules.min,
        rules.max
      );
    }
  }

  state.metrics.rpm = state.metrics.engineRpm;
  state.metrics.oilPressure = state.metrics.lubOilPressure;
};

const applyControlPatch = (payload) => {
  if (!payload || typeof payload !== "object") return;

  if (typeof payload.vehicleId === "string" && payload.vehicleId.trim()) {
    state.vehicleId = payload.vehicleId.trim();
  }

  if (payload.minIntervalSeconds !== undefined) {
    state.minIntervalSeconds = toPositiveInteger(
      payload.minIntervalSeconds,
      state.minIntervalSeconds
    );
  }

  if (payload.maxIntervalSeconds !== undefined) {
    state.maxIntervalSeconds = toPositiveInteger(
      payload.maxIntervalSeconds,
      state.maxIntervalSeconds
    );
  }

  applyMetricsPatch(payload.metrics);
};

app.get("/", (_, res) => {
  res.sendFile(path.resolve(__dirname, "control-panel.html"));
});

app.get("/api/state", (_, res) => {
  res.json(serializeState());
});

app.patch("/api/state", (req, res) => {
  applyControlPatch(req.body);
  res.json(serializeState());
});

app.post("/api/start", (_, res) => {
  if (!state.isActive) {
    state.isActive = true;

    runLoop().catch((error) => {
      state.lastResult = {
        ok: false,
        message: error.message,
        at: new Date().toISOString(),
      };

      state.isActive = false;
      state.nextSendAt = null;
      loopPromise = null;
    });
  }

  res.json(serializeState());
});

app.post("/api/stop", (_, res) => {
  state.isActive = false;
  state.nextSendAt = null;

  res.json(serializeState());
});

const controlPort = toPositiveInteger(
  process.env.SIMULATOR_CONTROL_PORT,
  5055
);

const server = app.listen(controlPort, () => {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║    🎛️  ROUND2 REAL-TIME CONTROL SIMULATOR (LIVE)          ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  console.log(`\nOpen control panel: http://localhost:${controlPort}`);
  console.log(`Target ingest endpoint: ${state.targetUrl}`);
  console.log("Streaming interval: random 10-15 seconds when active");
  console.log("Use Start/Stop in the browser to control streaming.\n");
});

const shutdown = () => {
  state.isActive = false;
  state.nextSendAt = null;

  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);