import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Apply persisted theme early to avoid flash
try {
  const theme = localStorage.getItem("oee.theme");
  if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
} catch {
  // ignore
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
