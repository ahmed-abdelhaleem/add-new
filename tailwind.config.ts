import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0a0a0b",
          800: "#15151a",
          700: "#1f1f26",
          600: "#2a2a33",
          500: "#3a3a47",
          400: "#6b6b7a",
          300: "#9b9bab",
          200: "#cfcfd9",
          100: "#ececf1",
        },
        flame: {
          DEFAULT: "#ff5d3b",
          dim: "#c14628",
        },
        gold: {
          DEFAULT: "#e8b552",
          dim: "#a98330",
        },
        mint: {
          DEFAULT: "#5ed09e",
          dim: "#3a8a68",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
