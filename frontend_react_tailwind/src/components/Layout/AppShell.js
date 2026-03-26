import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../../contexts/AuthContext";

const NAV = [
  { to: "/app/dashboard", label: "Dashboard", icon: "📈", roles: ["operator", "supervisor", "manager", "admin"] },
  { to: "/app/production", label: "Production", icon: "🏭", roles: ["operator", "supervisor", "manager", "admin"] },
  { to: "/app/downtime", label: "Downtime", icon: "⏱️", roles: ["operator", "supervisor", "manager", "admin"] },
  { to: "/app/quality", label: "Quality", icon: "✅", roles: ["operator", "supervisor", "manager", "admin"] },
  { to: "/app/shifts", label: "Shift Compare", icon: "🧭", roles: ["supervisor", "manager", "admin"] },
  { to: "/app/alerts", label: "Alerts", icon: "🔔", roles: ["operator", "supervisor", "manager", "admin"] },
  { to: "/app/reports", label: "Reports & Export", icon: "📄", roles: ["manager", "admin"] },
  { to: "/app/admin", label: "Admin", icon: "⚙️", roles: ["admin"] },
];

function getTheme() {
  try {
    const v = localStorage.getItem("oee.theme");
    return v === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function setTheme(theme) {
  try {
    localStorage.setItem("oee.theme", theme);
  } catch {
    // ignore
  }
  document.documentElement.setAttribute("data-theme", theme);
}

// PUBLIC_INTERFACE
export default function AppShell() {
  /** Main authenticated layout: responsive sidebar + topbar + content outlet. */
  const { user, role, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setThemeState] = useState(() => getTheme());
  const location = useLocation();

  const allowedNav = useMemo(() => NAV.filter((n) => n.roles.includes(role)), [role]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setThemeState(next);
    setTheme(next);
  };

  // ensure theme applied once
  React.useEffect(() => {
    setTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-ocean-bg">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white px-3 py-4 md:flex">
          <div className="px-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-amber-400/20 ring-1 ring-slate-200" />
              <div className="leading-tight">
                <div className="text-sm font800 font-extrabold text-slate-900">Ocean OEE</div>
                <div className="text-xs text-slate-500">Line performance monitor</div>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex-1 space-y-1">
            {allowedNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
                    isActive ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-slate-700 hover:bg-slate-50"
                  )
                }
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 ocean-card p-3">
            <div className="text-xs font-semibold text-slate-500">Signed in as</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{user?.name || "User"}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="ocean-badge bg-amber-100 text-amber-800">{role}</span>
              <button className="ocean-btn-ghost px-2 py-1 text-xs" onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile overlay sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">Ocean OEE</div>
                <button className="ocean-btn-ghost px-2 py-1" onClick={() => setSidebarOpen(false)} aria-label="Close">
                  ✕
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {allowedNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
                        isActive ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-slate-700 hover:bg-slate-50"
                      )
                    }
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="mt-6 ocean-card p-3">
                <div className="text-xs font-semibold text-slate-500">Role</div>
                <div className="mt-1 ocean-badge bg-amber-100 text-amber-800">{role}</div>
                <button className="mt-3 w-full ocean-btn-primary" onClick={logout}>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  className="ocean-btn-ghost md:hidden"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open menu"
                >
                  ☰
                </button>
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Real-time OEE</div>
                  <div className="text-xs text-slate-500">KPIs • Trends • Events</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="ocean-btn-ghost" onClick={toggleTheme} aria-label="Toggle theme">
                  {theme === "light" ? "🌙" : "☀️"}
                </button>
                <div className="hidden items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm md:flex">
                  <span className="font-semibold text-slate-700">{user?.name || "User"}</span>
                  <span className="ocean-badge bg-blue-100 text-blue-800">{role}</span>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-5">
            <Outlet />
          </main>

          <footer className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            Ocean Professional • OEE Monitoring SPA
          </footer>
        </div>
      </div>
    </div>
  );
}
