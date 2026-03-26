const jwt = require("jsonwebtoken");
const { getConfig } = require("../config");
const { HttpError } = require("./errors");

function parseBearer(authHeader) {
  if (!authHeader) return "";
  const v = String(authHeader);
  const m = v.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : "";
}

// PUBLIC_INTERFACE
function requireAuth() {
  /** Express middleware that requires a valid JWT Bearer token. */
  return (req, _res, next) => {
    const config = getConfig();
    const token = parseBearer(req.headers.authorization);

    // Allow "demo mode" (no token) when JWT_SECRET is not configured.
    // This matches frontend behavior that can operate without a token.
    if (!config.jwt.secret) {
      req.user = {
        id: "demo",
        email: "demo@factory.local",
        name: "Demo User",
        role: "operator",
        demo: true,
      };
      return next();
    }

    if (!token) return next(new HttpError(401, "Missing Authorization Bearer token"));

    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      });
      req.user = {
        id: decoded.sub || decoded.user_id || "unknown",
        email: decoded.email,
        name: decoded.name || decoded.email || "User",
        role: decoded.role || "operator",
      };
      return next();
    } catch (e) {
      return next(new HttpError(401, "Invalid token"));
    }
  };
}

// PUBLIC_INTERFACE
function requireRole(allow = []) {
  /** Express middleware that enforces RBAC based on req.user.role. */
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "Not authenticated"));
    if (allow.length === 0) return next();
    if (!allow.includes(req.user.role)) return next(new HttpError(403, "Forbidden"));
    return next();
  };
}

module.exports = { requireAuth, requireRole };
