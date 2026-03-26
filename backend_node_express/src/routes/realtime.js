const express = require("express");
const { getConfig } = require("../config");

const router = express.Router();

// PUBLIC_INTERFACE
router.get("/", (req, res) => {
  /** Returns realtime connection help and configured endpoints for Socket.IO. */
  const config = getConfig();

  res.json({
    socketio: {
      path: "/socket.io",
      auth: {
        note:
          "JWT auth required when JWT_SECRET is configured. Provide token via socket.io client `auth: { token }` (recommended) or `Authorization: Bearer <token>` header.",
      },
      events: [
        {
          name: "kpi:update",
          payload: "{ ts, scope, lineId, shiftId, kpis }",
          purpose: "Live dashboard KPI cards (Availability/Performance/Quality/OEE).",
        },
        {
          name: "alert:update",
          payload: "{ ts, type, alert }",
          purpose: "Live alert list/toasts (e.g., OEE<75%, predictive maintenance).",
        },
        {
          name: "activity:update",
          payload: "{ ts, type, entity, data }",
          purpose:
            "Live activity feed updates (production runs, downtime, defects, quick logs).",
        },
      ],
    },
    configured: {
      frontendUrl: config.frontendUrl || null,
      backendUrl: config.backendUrl || config.apiBase || null,
    },
  });
});

module.exports = router;
