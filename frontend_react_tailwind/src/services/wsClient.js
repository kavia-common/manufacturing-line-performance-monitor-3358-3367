import { io } from "socket.io-client";
import { getEnv } from "../config/env";

/**
 * Socket.IO events emitted by backend_node_express/src/realtime/socketServer.js:
 * - "socket:hello"   { ts, user }
 * - "kpi:update"     { ts, scope, lineId, shiftId, kpis }
 * - "alert:update"   { ts, type, alert }
 * - "activity:update"{ ts, type, entity, data }
 * - "realtime:event" { ts, event }
 */

function safeJsonStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function normalizeHttpUrl(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  // Allow passing just host:port or full URL. If no scheme, prefix with current protocol.
  if (/^https?:\/\//i.test(s)) return s;
  const proto = window?.location?.protocol || "http:";
  return `${proto}//${s.replace(/^\/+/, "")}`;
}

function resolveSocketEndpoint() {
  /**
   * Prefer REACT_APP_BACKEND_URL (base URL like https://api.example.com),
   * fall back to REACT_APP_WS_URL (legacy) and finally to current origin.
   *
   * Note: Socket.IO needs an HTTP(S) URL for its handshake, not ws(s)://.
   */
  const { backendUrl, wsUrl } = getEnv();

  if (backendUrl) return normalizeHttpUrl(backendUrl);

  // If wsUrl is provided as ws(s)://..., convert to http(s):// for Socket.IO.
  const ws = String(wsUrl || "").trim();
  if (ws) {
    if (/^wss:\/\//i.test(ws)) return ws.replace(/^wss:/i, "https:");
    if (/^ws:\/\//i.test(ws)) return ws.replace(/^ws:/i, "http:");
    // If it was already http(s), keep.
    if (/^https?:\/\//i.test(ws)) return ws;
  }

  // Safe default: same-origin (works when reverse-proxying frontend+backend together)
  const origin = window?.location?.origin;
  return origin || "";
}

// PUBLIC_INTERFACE
export function createSocketClient({ getToken, onStatus } = {}) {
  /** Creates a Socket.IO client with reconnect and JWT auth support. */
  const baseUrl = resolveSocketEndpoint();

  // path defaults to "/socket.io" on the backend
  const socket = io(baseUrl, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 15000,
    auth: (cb) => {
      const token = getToken?.();
      cb({ token: token || "" });
    },
  });

  const set = (state, detail) => onStatus?.({ state, detail });

  socket.on("connect", () => set("connected"));
  socket.on("disconnect", (reason) => set("disconnected", reason));
  socket.on("connect_error", (err) => set("error", err?.message || String(err)));
  socket.io.on("reconnect_attempt", (attempt) => set("reconnecting", attempt));
  socket.io.on("reconnect", () => set("connected"));
  socket.io.on("reconnect_error", (err) => set("error", err?.message || String(err)));

  const connect = () => {
    set("connecting", { baseUrl, path: "/socket.io" });
    socket.connect();
  };

  const close = () => {
    try {
      socket.disconnect();
    } catch {
      // ignore
    }
  };

  const emit = (eventName, payload) => {
    socket.emit(eventName, payload);
  };

  /**
   * Helper to subscribe/unsubscribe with a stable handler.
   */
  const on = (eventName, handler) => {
    socket.on(eventName, handler);
    return () => socket.off(eventName, handler);
  };

  const debugSnapshot = () => ({
    id: socket.id,
    connected: socket.connected,
    endpoint: `${baseUrl} (path=/socket.io)`,
    transport: socket.io?.engine?.transport?.name,
    authTokenPresent: Boolean(getToken?.()),
  });

  return { socket, connect, close, emit, on, debugSnapshot, _unsafe: { safeJsonStringify, safeParse } };
}
