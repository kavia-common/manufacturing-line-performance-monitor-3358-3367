import { getEnv } from "../config/env";

// PUBLIC_INTERFACE
export class ApiError extends Error {
  /** Represents an HTTP error response from the backend API. */
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const buildUrl = (base, path) => {
  if (!base) return path;
  return `${base.replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;
};

async function safeJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// PUBLIC_INTERFACE
export function createApiClient({ getToken } = {}) {
  /** Creates a thin fetch wrapper using REACT_APP_API_BASE and optional bearer auth. */
  const { apiBase } = getEnv();

  const request = async (method, path, { query, body, headers } = {}) => {
    const url = new URL(buildUrl(apiBase, path), window.location.origin);
    if (query && typeof query === "object") {
      Object.entries(query).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        url.searchParams.set(k, String(v));
      });
    }

    const token = getToken?.();
    const res = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
      const parsed = await safeJson(res);
      throw new ApiError(`Request failed: ${method} ${path}`, { status: res.status, body: parsed });
    }
    return safeJson(res);
  };

  const requestBlob = async (method, path, { query, headers } = {}) => {
    const url = new URL(buildUrl(apiBase, path), window.location.origin);
    if (query && typeof query === "object") {
      Object.entries(query).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        url.searchParams.set(k, String(v));
      });
    }

    const token = getToken?.();
    const res = await fetch(url.toString(), {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
    });

    if (!res.ok) {
      const parsed = await safeJson(res);
      throw new ApiError(`Request failed: ${method} ${path}`, { status: res.status, body: parsed });
    }

    // Backend returns application/pdf; we expose raw Blob for download/display.
    return res.blob();
  };

  return {
    get: (path, opts) => request("GET", path, opts),
    post: (path, opts) => request("POST", path, opts),
    put: (path, opts) => request("PUT", path, opts),
    del: (path, opts) => request("DELETE", path, opts),

    // Common domain endpoints
    authLogin: (payload) => request("POST", "/auth/login", { body: payload }),
    authMe: () => request("GET", "/auth/me"),

    oeeSummary: (params) => request("GET", "/oee/summary", { query: params }),
    oeeTrends: (params) => request("GET", "/oee/trends", { query: params }),

    productionList: (params) => request("GET", "/production", { query: params }),
    productionCreate: (payload) => request("POST", "/production", { body: payload }),

    downtimeList: (params) => request("GET", "/downtime", { query: params }),
    downtimeCreate: (payload) => request("POST", "/downtime", { body: payload }),

    qualityList: (params) => request("GET", "/quality", { query: params }),
    qualityCreate: (payload) => request("POST", "/quality", { body: payload }),

    alertsList: (params) => request("GET", "/alerts", { query: params }),
    alertsAck: (id) => request("POST", `/alerts/${id}/ack`),

    // Predictive maintenance
    predictGet: (machineId, params) => request("GET", `/predict/${encodeURIComponent(machineId)}`, { query: params }),

    // Mobile operator workflows
    mobileScan: (payload) => request("POST", "/scan", { body: payload }),
    mobileQuickLog: (payload) => request("POST", "/quick-log", { body: payload }),

    // Reports
    reportsOeePdf: (params) => requestBlob("GET", "/reports/oee.pdf", { query: params }),
  };
}
