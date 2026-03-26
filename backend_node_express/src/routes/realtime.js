const express = require("express");
const { subscribe } = require("../realtime/eventBus");
const { getConfig } = require("../config");

const router = express.Router();

// PUBLIC_INTERFACE
router.get("/", (req, res) => {
  /** Returns realtime connection help and configured endpoints. */
  const config = getConfig();
  res.json({
    ws: {
      path: "/ws",
      note: "Frontend uses REACT_APP_WS_URL (e.g., ws://host:port/ws).",
    },
    sse: {
      path: "/realtime/stream",
      note: "SSE stream of the same events as WS (text/event-stream).",
    },
    configured: {
      wsUrl: config.wsUrl || null,
      frontendUrl: config.frontendUrl || null,
    },
  });
});

// PUBLIC_INTERFACE
router.get("/stream", (req, res) => {
  /** SSE stream for realtime events (alternative to WebSocket). */
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  // Initial event
  res.write(`event: hello\ndata: ${JSON.stringify({ type: "sse.hello", ts: new Date().toISOString() })}\n\n`);

  const unsub = subscribe((evt) => {
    res.write(`event: message\ndata: ${JSON.stringify(evt)}\n\n`);
  });

  const keepAlive = setInterval(() => {
    res.write(`event: ping\ndata: ${JSON.stringify({ type: "sse.ping", ts: new Date().toISOString() })}\n\n`);
  }, 25_000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsub();
  });
});

module.exports = router;
