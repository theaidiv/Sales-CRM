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
        // Brand — deep navy (#001689) → turquoise → cyan gradient identity.
        brand: {
          50: "#eef1fb",
          100: "#d6dcf3",
          200: "#aab6e6",
          300: "#7b8dd6",
          400: "#4d63c4",
          500: "#2a40ab",
          600: "#0d2199",
          700: "#001689",
          800: "#001070",
          900: "#000a4d",
          950: "#00062e",
        },
        // Secondary — turquoise (#0099A8).
        secondary: {
          50: "#e6f7f9",
          100: "#c0ecf0",
          200: "#8ddee5",
          300: "#4fcad6",
          400: "#1bb0c0",
          500: "#0099a8",
          600: "#007e8b",
          700: "#006570",
          800: "#00505a",
          900: "#003b42",
        },
        // Accent — cyan (#0FBDFF), light #7DE9FF.
        accent: {
          50: "#e9f9ff",
          100: "#cbf0ff",
          200: "#7de9ff",
          300: "#3dd5ff",
          400: "#0fbdff",
          500: "#00a0e6",
          600: "#0081bd",
          700: "#00688f",
          800: "#005573",
          900: "#00455e",
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
        glow: "0 0 0 1px rgb(15 189 255 / 0.20), 0 8px 30px -8px rgb(0 22 137 / 0.45)",
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
