import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// PUBLIC_INTERFACE
export default function LoginPage() {
  /** Login screen for the app. Supports role selection for demo/QA. */
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || "/app/dashboard";

  const [email, setEmail] = useState("operator@factory.local");
  const [password, setPassword] = useState("password");
  const [role, setRole] = useState("operator");
  const [status, setStatus] = useState({ loading: false, error: "", warning: "" });

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: "", warning: "" });
    const res = await login({ email, password, role });
    if (!res.ok) {
      setStatus({ loading: false, error: res.error || "Login failed", warning: "" });
      return;
    }
    setStatus({ loading: false, error: "", warning: res.warning || "" });
    nav(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500/10 to-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-amber-400/20 ring-1 ring-slate-200" />
          <h1 className="text-2xl font-extrabold text-slate-900">Ocean OEE</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in to monitor real-time manufacturing line performance.
          </p>
        </div>

        <div className="ocean-card p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input className="ocean-input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <input
                className="ocean-input mt-1"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Role</label>
              <select className="ocean-input mt-1" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="operator">Operator</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">Role controls available screens in the sidebar.</p>
            </div>

            {status.warning ? (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-100">
                {status.warning}
              </div>
            ) : null}
            {status.error ? (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{status.error}</div>
            ) : null}

            <button className="w-full ocean-btn-primary" disabled={status.loading}>
              {status.loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>Need help?</span>
              <Link className="font-semibold text-blue-700 hover:underline" to="/about">
                About this app
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          API base: <span className="font-mono">{process.env.REACT_APP_API_BASE || "(not set)"}</span>
        </div>
      </div>
    </div>
  );
}
