import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mastek-inspired brand — deep purple/violet with a magenta gradient.
        brand: {
          50: "#f8f4fc",
          100: "#efe3f8",
          200: "#dec6f0",
          300: "#c79fe6",
          400: "#a86fd6",
          500: "#8c41c4",
          600: "#7a32b0",
          700: "#662d91",
          800: "#532676",
          900: "#3f1d5a",
          950: "#29103d",
        },
        // Magenta/pink accent — the other end of the Mastek gradient.
        accent: {
          50: "#fdf4fb",
          100: "#fae6f6",
          200: "#f5cdee",
          300: "#eea3df",
          400: "#e36cc9",
          500: "#d6249f",
          600: "#b91d8a",
          700: "#971a72",
        },
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover": "0 10px 30px -10px rgb(15 23 42 / 0.18), 0 2px 8px -2px rgb(15 23 42 / 0.08)",
        elevated: "0 20px 50px -20px rgb(15 23 42 / 0.25)",
        glow: "0 0 0 1px rgb(122 50 176 / 0.20), 0 8px 30px -8px rgb(102 45 145 / 0.45)",
        "inner-top": "inset 0 1px 0 0 rgb(255 255 255 / 0.6)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.4s ease both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.22,1,0.36,1) both",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgb(15 23 42 / 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgb(15 23 42 / 0.03) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
