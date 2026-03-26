const { randomUUID } = require("crypto");

// PUBLIC_INTERFACE
function requestIdMiddleware() {
  /** Express middleware that adds a stable requestId to req/res. */
  return (req, res, next) => {
    const header = req.headers["x-request-id"];
    const requestId = header && String(header).trim() ? String(header) : randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  };
}

module.exports = { requestIdMiddleware };
