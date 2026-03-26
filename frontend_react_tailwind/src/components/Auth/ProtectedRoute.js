import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

// PUBLIC_INTERFACE
export function ProtectedRoute() {
  /** Ensures user is authenticated before showing nested routes. */
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

// PUBLIC_INTERFACE
export function RoleRoute({ allow = [] }) {
  /** Ensures user has one of the allowed roles before showing nested routes. */
  const { role } = useAuth();
  if (allow.length > 0 && !allow.includes(role)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <Outlet />;
}
