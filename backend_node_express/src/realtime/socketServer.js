const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const { getConfig } = require("../config");
const { subscribe, publish } = require("./eventBus");

/**
 * Parse a JWT token from multiple Socket.IO supported locations:
 * - handshake.auth.token (recommended)
 * - Authorization header ("Bearer <token>")
 * - query param "token"
 */
function extractTokenFromHandshake(handshake) {
  const authToken = handshake?.auth?.token;
  if (authToken) return String(authToken);

  const headerAuth =
    handshake?.headers?.authorization || handshake?.headers?.Authorization;
  if (headerAuth) {
    const m = String(headerAuth).match(/^Bearer\s+(.+)$/i);
    if (m) return m[1];
  }

  const queryToken = handshake?.query?.token;
  if (queryToken) return String(queryToken);

  return "";
}

function buildSocketUserFromJwt(decoded) {
  return {
    id: decoded.sub || decoded.user_id || "unknown",
    email: decoded.email,
    name: decoded.name || decoded.email || "User",
    role: decoded.role || "operator",
  };
}

/**
 * Maps internal event-bus events to Socket.IO event names and payload shapes.
 * This keeps backward compatibility with the existing event-bus style while
 * giving the frontend stable Socket.IO channels.
 */
function mapBusEventToSocket(evt) {
  if (!evt || typeof evt !== "object") return null;

  const ts = evt.ts || new Date().toISOString();

  // Alerts: emitted by alert engine and/or routes
  if (evt.type === "alert.created" || evt.type === "alert.updated") {
    return {
      name: "alert:update",
      payload: {
        ts,
        type: evt.type,
        alert: evt.alert || evt.data || evt.payload || null,
      },
    };
  }

  // KPI snapshots (for live dashboard cards)
  if (evt.type === "kpi.snapshot") {
    return {
      name: "kpi:update",
      payload: {
        ts,
        scope: evt.scope || "line",
        lineId: evt.lineId || null,
        shiftId: evt.shiftId || null,
        kpis: evt.kpis || evt.data || {},
      },
    };
  }

  // Activity events: production/downtime/quality actions etc.
  if (evt.type && evt.type.startsWith("activity.")) {
    return {
      name: "activity:update",
      payload: {
        ts,
        type: evt.type,
        entity: evt.entity || null,
        data: evt.data || evt.payload || null,
      },
    };
  }

  // Generic pass-through (namespaced so frontend can inspect)
  return {
    name: "realtime:event",
    payload: { ts, event: evt },
  };
}

// PUBLIC_INTERFACE
function createSocketServer({ server, path = "/socket.io" } = {}) {
  /**
   * Attaches a Socket.IO server to an existing HTTP server.
   *
   * Auth:
   * - Uses JWT Bearer token. Provide token via:
   *   - socket.io client `auth: { token }` (recommended), or
   *   - `Authorization: Bearer <token>` header, or
   *   - `?token=<token>` query param.
   * - If JWT_SECRET is not configured, server allows "demo mode" connections.
   *
   * Emits (frontend-consumed):
   * - "kpi:update"      { ts, scope, lineId, shiftId, kpis }
   * - "alert:update"    { ts, type, alert }
   * - "activity:update" { ts, type, entity, data }
   * Also emits:
   * - "realtime:event"  { ts, event } (debug / generic)
   */
  const config = getConfig();

  const io = new Server(server, {
    path,
    cors: {
      origin: config.frontendUrl ? [config.frontendUrl] : true,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  // JWT-authenticated connections
  io.use((socket, next) => {
    // Demo mode: allow connections when secret is not configured (mirrors HTTP auth middleware)
    if (!config.jwt.secret) {
      socket.user = {
        id: "demo",
        email: "demo@factory.local",
        name: "Demo User",
        role: "operator",
        demo: true,
      };
      return next();
    }

    const token = extractTokenFromHandshake(socket.handshake);
    if (!token) return next(new Error("Missing auth token"));

    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      });
      socket.user = buildSocketUserFromJwt(decoded);
      return next();
    } catch (e) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // Basic handshake confirmation (useful for frontend)
    socket.emit("socket:hello", {
      ts: new Date().toISOString(),
      user: socket.user,
    });

    // Optional: allow client to request a KPI refresh (frontend can call after reconnect)
    socket.on("kpi:request", (payload = {}) => {
      publish({
        type: "activity.kpi.request",
        ts: new Date().toISOString(),
        user: socket.user,
        data: payload,
      });
    });

    // Optional: keep-alive ping (Socket.IO already heartbeats)
    socket.on("client:ping", () => {
      socket.emit("server:pong", { ts: new Date().toISOString() });
    });
  });

  // Forward all bus events to Socket.IO clients
  const unsubscribe = subscribe((evt) => {
    const mapped = mapBusEventToSocket(evt);
    if (!mapped) return;
    io.emit(mapped.name, mapped.payload);
  });

  io.on("close", () => {
    unsubscribe();
  });

  publish({ type: "socket.ready", ts: new Date().toISOString(), path });

  return io;
}

/**
 * Helper emitter: publish KPI snapshot to realtime bus (will be forwarded to Socket.IO).
 */
// PUBLIC_INTERFACE
function emitKpiUpdate({ scope = "line", lineId = null, shiftId = null, kpis = {} } = {}) {
  /** Emits a KPI snapshot update event for live dashboards. */
  publish({
    type: "kpi.snapshot",
    ts: new Date().toISOString(),
    scope,
    lineId,
    shiftId,
    kpis,
  });
}

/**
 * Helper emitter: publish an alert update event to realtime bus.
 */
// PUBLIC_INTERFACE
function emitAlertUpdate({ type = "alert.created", alert } = {}) {
  /** Emits an alert event for live alert lists/toasts. */
  publish({
    type,
    ts: new Date().toISOString(),
    alert,
  });
}

/**
 * Helper emitter: publish an activity update event to realtime bus.
 */
// PUBLIC_INTERFACE
function emitActivityUpdate({ type, entity = null, data = null } = {}) {
  /** Emits an activity event (production/downtime/quality/etc) for live activity feeds. */
  publish({
    type: type || "activity.unknown",
    ts: new Date().toISOString(),
    entity,
    data,
  });
}

module.exports = {
  createSocketServer,
  emitKpiUpdate,
  emitAlertUpdate,
  emitActivityUpdate,
};
