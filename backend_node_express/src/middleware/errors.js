class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

function notFoundHandler() {
  return (req, res) => {
    res.status(404).json({
      error: {
        code: "not_found",
        message: "Route not found",
        path: req.path,
        requestId: req.requestId,
      },
    });
  };
}

function httpErrorHandler() {
  return (err, req, res, next) => {
    // eslint-disable-next-line no-unused-vars
    if (!err) return next();

    const status =
      err instanceof HttpError
        ? err.status
        : typeof err.status === "number"
          ? err.status
          : 500;

    const code =
      err.code ||
      (status === 401
        ? "unauthorized"
        : status === 403
          ? "forbidden"
          : status === 400
            ? "bad_request"
            : "internal_error");

    const message =
      status === 500
        ? "Internal server error"
        : err.message || "Request failed";

    if (status >= 500) {
      // eslint-disable-next-line no-console
      console.error("[http]", err);
    }

    res.status(status).json({
      error: {
        code,
        message,
        details: err.details,
        requestId: req.requestId,
      },
    });
  };
}

module.exports = { HttpError, notFoundHandler, httpErrorHandler };
