const WebSocket = require("ws");
const { subscribe, publish } = require("./eventBus");

// PUBLIC_INTERFACE
function createWsServer({ server, path = "/ws" } = {}) {
  /**
   * Attaches a WebSocket server to an existing HTTP server.
   * Broadcasts published events to all connected clients.
   */
  const wss = new WebSocket.Server({ server, path });

  const heartbeat = (ws) => {
    ws.isAlive = true;
  };

  wss.on("connection", (ws, req) => {
    ws.isAlive = true;

    // Initial hello
    ws.send(
      JSON.stringify({
        type: "ws.hello",
        ts: new Date().toISOString(),
        path,
      })
    );

    ws.on("pong", () => heartbeat(ws));

    ws.on("message", (raw) => {
      // For future: allow client subscriptions. For now, accept pings / no-op.
      let msg = null;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        msg = String(raw);
      }
      if (msg && msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", ts: new Date().toISOString() }));
      }
    });

    ws.on("close", () => {
      // no-op
    });
  });

  // Broadcast events
  const unsubscribe = subscribe((evt) => {
    const payload = JSON.stringify(evt);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  });

  // Keepalive timer
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30_000);

  wss.on("close", () => {
    clearInterval(interval);
    unsubscribe();
  });

  // Emit operational event
  publish({ type: "ws.ready", ts: new Date().toISOString(), path });

  return wss;
}

module.exports = { createWsServer };
