/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef7ff",
          100: "#d8ecff",
          200: "#b8ddff",
          300: "#8bc9ff",
          400: "#57afff",
          500: "#2f8eff",
          600: "#1f6feb",
          700: "#1957cf",
          800: "#1b48a7",
          900: "#1d3f83",
        },
        slate: {
          950: "#0d1626",
        },
      },
      boxShadow: {
        panel: "0 20px 45px -24px rgba(7, 25, 64, 0.45)",
      },
    },
  },
  plugins: [],
};
