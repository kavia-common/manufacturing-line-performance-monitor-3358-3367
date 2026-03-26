import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AppShell from "./components/Layout/AppShell";
import { ProtectedRoute, RoleRoute } from "./components/Auth/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import AboutPage from "./pages/AboutPage";
import DashboardPage from "./pages/DashboardPage";
import ProductionPage from "./pages/ProductionPage";
import DowntimePage from "./pages/DowntimePage";
import QualityPage from "./pages/QualityPage";
import ShiftComparePage from "./pages/ShiftComparePage";
import AlertsPage from "./pages/AlertsPage";
import ReportsPage from "./pages/ReportsPage";
import AdminPage from "./pages/AdminPage";
import NotFoundPage from "./pages/NotFoundPage";
import PredictiveMaintenancePage from "./pages/PredictiveMaintenancePage";
import MobileOperatorPage from "./pages/MobileOperatorPage";

import "./App.css";

// PUBLIC_INTERFACE
export default function App() {
  /** App entry: router + auth provider + protected layout routes. */
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/about" element={<AboutPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppShell />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="production" element={<ProductionPage />} />
              <Route path="downtime" element={<DowntimePage />} />
              <Route path="quality" element={<QualityPage />} />
              <Route element={<RoleRoute allow={["supervisor", "manager", "admin"]} />}>
                <Route path="shifts" element={<ShiftComparePage />} />
              </Route>
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="predictive" element={<PredictiveMaintenancePage />} />
              <Route path="mobile" element={<MobileOperatorPage />} />
              <Route element={<RoleRoute allow={["manager", "admin"]} />}>
                <Route path="reports" element={<ReportsPage />} />
              </Route>
              <Route element={<RoleRoute allow={["admin"]} />}>
                <Route path="admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
