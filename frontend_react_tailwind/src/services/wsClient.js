import { getEnv } from "../config/env";

// PUBLIC_INTERFACE
export function createWsClient({ onMessage, onStatus } = {}) {
  /** Creates a WebSocket client using REACT_APP_WS_URL with reconnect/backoff. */
  const { wsUrl } = getEnv();
  let ws = null;
  let closedByUser = false;
  let retry = 0;
  let retryTimer = null;

  const connect = () => {
    if (!wsUrl) {
      onStatus?.({ state: "disabled" });
      return;
    }
    onStatus?.({ state: "connecting" });
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      retry = 0;
      onStatus?.({ state: "open" });
    };
    ws.onclose = () => {
      onStatus?.({ state: "closed" });
      if (closedByUser) return;
      const backoff = Math.min(30000, 800 * Math.pow(2, retry++));
      retryTimer = window.setTimeout(connect, backoff);
      onStatus?.({ state: "reconnecting", backoffMs: backoff });
    };
    ws.onerror = () => {
      onStatus?.({ state: "error" });
    };
    ws.onmessage = (evt) => {
      let data = evt.data;
      try {
        data = JSON.parse(evt.data);
      } catch {
        // keep as string
      }
      onMessage?.(data);
    };
  };

  const send = (payload) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(typeof payload === "string" ? payload : JSON.stringify(payload));
    return true;
  };

  const close = () => {
    closedByUser = true;
    if (retryTimer) window.clearTimeout(retryTimer);
    if (ws) ws.close();
  };

  return { connect, send, close };
}
