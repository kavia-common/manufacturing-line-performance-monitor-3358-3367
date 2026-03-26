import { getEnv } from "../config/env";

function isWsScheme(url) {
  return /^wss?:\/\//i.test(String(url || ""));
}

function normalizeWsUrl({ configuredUrl, wsPath = "/ws" }) {
  /**
   * Ensures the WS URL is compatible with the current page security context.
   *
   * Rules:
   * - If current page is https:, never return ws:// (upgrade to wss:// when possible).
   * - If no configured WS URL is provided, derive from current location (same origin).
   * - Return { ok:false } when a safe URL cannot be produced.
   */
  const pageProtocol = window?.location?.protocol || "http:";
  const isHttpsPage = pageProtocol === "https:";

  // 1) If explicitly configured, normalize and (if needed) upgrade scheme.
  if (configuredUrl && isWsScheme(configuredUrl)) {
    let url = String(configuredUrl).trim();

    // If we're on https, browsers block ws://. Upgrade to wss://.
    if (isHttpsPage) {
      url = url.replace(/^ws:/i, "wss:");
    }

    // Final safety check: if still ws:// on https, disable.
    if (isHttpsPage && /^ws:\/\//i.test(url)) {
      return {
        ok: false,
        reason: "blocked_mixed_content",
        detail: `HTTPS page cannot open insecure WebSocket URL: ${url}`,
      };
    }

    return { ok: true, url };
  }

  // 2) Derive from current location (same origin).
  // This is a safe default for production deployments where frontend+backend are behind the same host.
  const host = window?.location?.host;
  if (host) {
    const scheme = isHttpsPage ? "wss:" : "ws:";
    const url = `${scheme}//${host}${wsPath.startsWith("/") ? wsPath : `/${wsPath}`}`;
    return { ok: true, url };
  }

  return { ok: false, reason: "no_url", detail: "No WebSocket URL configured and could not derive from location." };
}

// PUBLIC_INTERFACE
export function createWsClient({ onMessage, onStatus } = {}) {
  /** Creates a WebSocket client using REACT_APP_WS_URL with reconnect/backoff and HTTPS-safe URL handling. */
  const { wsUrl: configuredWsUrl } = getEnv();
  let ws = null;
  let closedByUser = false;
  let retry = 0;
  let retryTimer = null;

  const connect = () => {
    const normalized = normalizeWsUrl({ configuredUrl: configuredWsUrl, wsPath: "/ws" });

    if (!normalized.ok) {
      onStatus?.({ state: "disabled", reason: normalized.reason, detail: normalized.detail });
      return;
    }

    onStatus?.({ state: "connecting", url: normalized.url });
    try {
      ws = new WebSocket(normalized.url);
    } catch (e) {
      onStatus?.({ state: "disabled", reason: "constructor_failed", detail: String(e?.message || e) });
      return;
    }

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
      // Browser errors for WS are often opaque; still surface a state.
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
