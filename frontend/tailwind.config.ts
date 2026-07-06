import type { Config } from "tailwindcss";

// Design tokens are the single source of truth for the BountyFrame visual system.
// See ../visual-identity.md.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101014",
        "ink-2": "#1B1B21",
        "ink-60": "#5A5A63",
        paper: "#F5F2E9",
        "paper-2": "#ECE7D8",
        volt: "#D6FF3E",
        coral: "#FF5A36",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sharp: "2px",
      },
      boxShadow: {
        // hard offset "printed sticker" elevation — never soft blur
        stamp: "4px 4px 0 0 #101014",
        "stamp-volt": "4px 4px 0 0 #D6FF3E",
        "stamp-sm": "2px 2px 0 0 #101014",
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
      keyframes: {
        stampIn: {
          "0%": { transform: "scale(1.6) rotate(-8deg)", opacity: "0" },
          "60%": { transform: "scale(0.94) rotate(-3deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-3deg)", opacity: "1" },
        },
      },
      animation: {
        stampIn: "stampIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
