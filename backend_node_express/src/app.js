const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { getConfig } = require("./config");
const { requestIdMiddleware } = require("./middleware/requestId");
const { httpErrorHandler, notFoundHandler } = require("./middleware/errors");

const authRoutes = require("./routes/auth");
const linesRoutes = require("./routes/lines");
const shiftsRoutes = require("./routes/shifts");
const productionRoutes = require("./routes/production");
const downtimeRoutes = require("./routes/downtime");
const qualityRoutes = require("./routes/quality");
const oeeRoutes = require("./routes/oee");
const alertsRoutes = require("./routes/alerts");
const reportsRoutes = require("./routes/reports");
const realtimeRoutes = require("./routes/realtime");

function buildCorsOptions(config) {
  const allowOrigin = (origin, cb) => {
    // Allow non-browser clients and same-origin requests
    if (!origin) return cb(null, true);

    const allowed = new Set(
      [config.frontendUrl].filter(Boolean).map((v) => String(v).trim())
    );

    // If no frontendUrl configured, be permissive (useful in dev), but still allow.
    if (allowed.size === 0) return cb(null, true);

    if (allowed.has(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  };

  return {
    origin: allowOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
  };
}

// PUBLIC_INTERFACE
function createApp() {
  /**
   * Creates and configures the Express application.
   * Returns an Express app ready to be attached to an HTTP server.
   */
  const config = getConfig();
  const app = express();

  if (config.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(requestIdMiddleware());

  // Security headers
  app.use(
    helmet({
      // WebSocket/SSE do not need special CSP here; leave default helmet policies.
      // If you later add inline scripts, update CSP accordingly.
    })
  );

  app.use(cors(buildCorsOptions(config)));

  // Logging
  if (config.nodeEnv !== "test") {
    app.use(
      morgan("combined", {
        stream: {
          write: (msg) => process.stdout.write(msg),
        },
      })
    );
  }

  // Body parsing
  app.use(express.json({ limit: "1mb" }));

  // Basic rate limit (primarily for auth endpoints)
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 240,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      keyGenerator: (req) => req.ip || "unknown",
    })
  );

  // Health
  app.get(config.healthcheckPath, (req, res) => {
    res.json({
      ok: true,
      service: "backend_node_express",
      now: new Date().toISOString(),
      requestId: req.requestId,
    });
  });

  // API routes
  app.use("/auth", authRoutes);
  app.use("/lines", linesRoutes);
  app.use("/shifts", shiftsRoutes);
  app.use("/production", productionRoutes);
  app.use("/downtime", downtimeRoutes);
  app.use("/quality", qualityRoutes);
  app.use("/oee", oeeRoutes);
  app.use("/alerts", alertsRoutes);
  app.use("/reports", reportsRoutes);

  // Realtime docs + SSE connect route
  app.use("/realtime", realtimeRoutes);

  // 404 + errors
  app.use(notFoundHandler());
  app.use(httpErrorHandler());

  return app;
}

module.exports = { createApp };
