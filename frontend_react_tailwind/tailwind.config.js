/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ocean: {
          primary: "#2563EB",
          secondary: "#F59E0B",
          success: "#F59E0B",
          error: "#EF4444",
          bg: "#f9fafb",
          surface: "#ffffff",
          text: "#111827",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(17,24,39,0.06)",
      },
    },
  },
  plugins: [],
};
