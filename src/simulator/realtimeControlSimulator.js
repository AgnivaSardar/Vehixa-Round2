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
  if (!Number.isFinite(parsed)) {
    return fallbackValue;
  }

  const clamped = Math.min(max, Math.max(min, parsed));
  return Number(clamped.toFixed(decimals));
};

const METRIC_RULES = {
  engine_rpm: { min: 500, max: 6000, decimals: 2 },
  lub_oil_pressure: { min: 0, max: 10, decimals: 2 },
  fuel_pressure: { min: 0, max: 40, decimals: 2 },
  coolant_pressure: { min: 0, max: 10, decimals: 2 },
  lub_oil_temp: { min: 40, max: 150, decimals: 2 },
  coolant_temp: { min: 40, max: 130, decimals: 2 },
};

const defaultTargetUrl =
  process.env.SIMULATOR_TARGET_URL || `http://localhost:${env.PORT}${env.API_PREFIX}/telemetry`;

const state = {
  targetUrl: defaultTargetUrl,
  vehicleId: process.env.SIMULATOR_CONTROL_VEHICLE_ID || "vehicle-live-control-002",
  source: "REAL_TIME_CONTROL",
  minIntervalSeconds: 10,
  maxIntervalSeconds: 15,
  isActive: false,
  sentCount: 0,
  lastSentAt: null,
  lastResult: null,
  nextSendAt: null,
  metrics: {
    engine_rpm: 1200,
    lub_oil_pressure: 2.8,
    fuel_pressure: 15.2,
    coolant_pressure: 1.4,
    lub_oil_temp: 84.0,
    coolant_temp: 90.0,
  },
};

let loopPromise = null;

const getRandomIntervalSeconds = () => {
  const min = Math.min(state.minIntervalSeconds, state.maxIntervalSeconds);
  const max = Math.max(state.minIntervalSeconds, state.maxIntervalSeconds);
  return min + Math.floor(Math.random() * (max - min + 1));
};

const waitWithStopCheck = async (durationMs) => {
  let remainingMs = durationMs;

  while (remainingMs > 0) {
    if (!state.isActive) {
      return false;
    }

    const stepMs = Math.min(250, remainingMs);
    await sleep(stepMs);
    remainingMs -= stepMs;
  }

  return state.isActive;
};

const postTelemetry = async () => {
  const payload = {
    vehicleId: state.vehicleId,
    source: state.source,
    ...state.metrics,
    recordedAt: new Date().toISOString(),
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
  if (loopPromise) {
    return loopPromise;
  }

  loopPromise = (async () => {
    while (state.isActive) {
      const intervalSeconds = getRandomIntervalSeconds();
      state.nextSendAt = Date.now() + intervalSeconds * 1000;

      const shouldContinue = await waitWithStopCheck(intervalSeconds * 1000);
      if (!shouldContinue) {
        break;
      }

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
          `[control-simulator] sent #${state.sentCount} | vehicle=${state.vehicleId} | rpm=${state.metrics.engine_rpm}`
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
    state.nextSendAt === null ? null : Math.max(0, Math.ceil((state.nextSendAt - Date.now()) / 1000));

  return {
    ...state,
    secondsUntilNextSend,
  };
};

const applyMetricsPatch = (inputMetrics) => {
  if (!inputMetrics || typeof inputMetrics !== "object") {
    return;
  }

  for (const [metricName, rules] of Object.entries(METRIC_RULES)) {
    if (inputMetrics[metricName] !== undefined) {
      state.metrics[metricName] = clampNumber(
        inputMetrics[metricName],
        state.metrics[metricName],
        rules.min,
        rules.max,
        rules.decimals
      );
    }
  }
};

const applyControlPatch = (payload) => {
  if (!payload || typeof payload !== "object") {
    return;
  }

  if (typeof payload.vehicleId === "string" && payload.vehicleId.trim().length > 0) {
    state.vehicleId = payload.vehicleId.trim();
  }

  if (payload.minIntervalSeconds !== undefined) {
    state.minIntervalSeconds = toPositiveInteger(payload.minIntervalSeconds, state.minIntervalSeconds);
  }

  if (payload.maxIntervalSeconds !== undefined) {
    state.maxIntervalSeconds = toPositiveInteger(payload.maxIntervalSeconds, state.maxIntervalSeconds);
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

const controlPort = toPositiveInteger(process.env.SIMULATOR_CONTROL_PORT, 5055);
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

  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
