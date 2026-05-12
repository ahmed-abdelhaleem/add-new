import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // PRD §6.1 — premium dark warm palette.
        ink: {
          900: "#0F0E0C",
          800: "#1C1A16",
          700: "#26241F",
          600: "#332F28",
          500: "#494337",
          400: "#7A7060",
          300: "#A39580",
          200: "#D4C9B6",
          100: "#F0EBE0",
        },
        gold: {
          DEFAULT: "#C9962A",
          dim: "#8E6A1D",
        },
        amber: {
          DEFAULT: "#E8C882",
          dim: "#B89B5C",
        },
        mint: {
          DEFAULT: "#4A8C3F",
          dim: "#356430",
        },
        flame: {
          DEFAULT: "#C45A2A", // at-risk only — never for failures
          dim: "#8C4020",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        display: ["DM Sans", "Instrument Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.85", boxShadow: "0 0 24px rgba(201,150,42,0.20)" },
          "50%": { opacity: "1", boxShadow: "0 0 40px rgba(201,150,42,0.45)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        flamePulse: {
          "0%, 100%": { transform: "scale(1)", filter: "brightness(0.95)" },
          "50%": { transform: "scale(1.08)", filter: "brightness(1.15)" },
        },
        rollUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseGlow: {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        breathe: "breathe 4s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        flame: "flamePulse 1.8s ease-in-out infinite",
        rollUp: "rollUp 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        pulseGlow: "pulseGlow 800ms ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
