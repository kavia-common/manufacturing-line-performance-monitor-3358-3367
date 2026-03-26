/**
 * Environment configuration for the SPA.
 * Values are sourced from REACT_APP_* variables (CRA convention).
 */

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// PUBLIC_INTERFACE
export function getEnv() {
  /** Returns normalized environment configuration for API/WS and feature flags. */
  const apiBase = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || "";
  const backendUrl = process.env.REACT_APP_BACKEND_URL || apiBase;
  const wsUrl = process.env.REACT_APP_WS_URL || "";
  const frontendUrl = process.env.REACT_APP_FRONTEND_URL || "";

  return {
    apiBase,
    backendUrl,
    wsUrl,
    frontendUrl,
    nodeEnv: process.env.REACT_APP_NODE_ENV || process.env.NODE_ENV || "development",
    logLevel: process.env.REACT_APP_LOG_LEVEL || "info",
    healthcheckPath: process.env.REACT_APP_HEALTHCHECK_PATH || "/healthz",
    trustProxy: String(process.env.REACT_APP_TRUST_PROXY || "false") === "true",
    experimentsEnabled: String(process.env.REACT_APP_EXPERIMENTS_ENABLED || "false") === "true",
    featureFlags: parseJson(process.env.REACT_APP_FEATURE_FLAGS, {}),
    enableSourceMaps: String(process.env.REACT_APP_ENABLE_SOURCE_MAPS || "true") === "true",
  };
}
