function envBool(v, fallback = false) {
  if (v === undefined || v === null || v === "") return fallback;
  return String(v).toLowerCase() === "true";
}

function envInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// PUBLIC_INTERFACE
function getConfig() {
  /**
   * Returns normalized backend configuration.
   * Uses REACT_APP_* variables for parity with frontend wiring, plus JWT_* / JWT_SECRET.
   *
   * MongoDB:
   * - REACT_APP_MONGODB_URI: full MongoDB connection string (recommended)
   * - REACT_APP_MONGODB_DB: optional DB name override
   */
  const port = envInt(process.env.REACT_APP_PORT, 8080);

  return {
    port,
    nodeEnv:
      process.env.REACT_APP_NODE_ENV ||
      process.env.NODE_ENV ||
      "development",
    trustProxy: envBool(process.env.REACT_APP_TRUST_PROXY, false),
    logLevel: process.env.REACT_APP_LOG_LEVEL || "info",
    healthcheckPath: process.env.REACT_APP_HEALTHCHECK_PATH || "/healthz",

    apiBase:
      process.env.REACT_APP_API_BASE ||
      process.env.REACT_APP_BACKEND_URL ||
      "",
    backendUrl:
      process.env.REACT_APP_BACKEND_URL ||
      process.env.REACT_APP_API_BASE ||
      "",
    frontendUrl: process.env.REACT_APP_FRONTEND_URL || "",

    wsUrl: process.env.REACT_APP_WS_URL || "",

    mongo: {
      uri: process.env.REACT_APP_MONGODB_URI || "",
      dbName: process.env.REACT_APP_MONGODB_DB || "",
    },

    jwt: {
      secret: process.env.JWT_SECRET || "",
      issuer: process.env.JWT_ISSUER || "ocean-oee",
      audience: process.env.JWT_AUDIENCE || "ocean-oee-spa",
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    },
  };
}

module.exports = { getConfig };
