import React from "react";
import { Link } from "react-router-dom";

// PUBLIC_INTERFACE
export default function NotFoundPage() {
  /** 404 screen. */
  return (
    <div className="mx-auto max-w-xl">
      <div className="ocean-card p-8 text-center">
        <div className="text-4xl font-extrabold text-slate-900">404</div>
        <div className="mt-2 text-sm text-slate-600">That page doesn’t exist.</div>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link to="/app/dashboard" className="ocean-btn-primary">
            Go to dashboard
          </Link>
          <Link to="/login" className="ocean-btn-ghost">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
