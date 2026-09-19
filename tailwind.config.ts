import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand chrome — "signal from noise" identity. Every surface in the
        // product is dark; depth comes from translucency and blur (glass),
        // not from swapping to a lighter panel color the way the old light
        // theme did. Kept separate from the semantic colors below so brand
        // and data meaning never collide.
        base: {
          DEFAULT: "#05060B", // page background — near-black, a hair of blue
          2: "#0D0F1A", // raised panel: sidebar, hero panel, popovers
          3: "#151827", // further-raised: hover states, nested surfaces
        },
        fg: {
          DEFAULT: "#F3F5FA", // primary text — off-white, never pure #fff
          2: "#9BA3B7", // secondary text
          3: "#666E82", // tertiary / muted / placeholder text
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.09)",
          2: "rgba(255,255,255,0.16)", // hover / focus-adjacent border
        },
        // Primary accent — blue → violet. The gradient itself is applied as
        // `from-primary to-primary-2`; either stop also stands alone.
        primary: {
          DEFAULT: "#4C7DFF",
          hover: "#3D6BEF",
          2: "#8B5CF6",
          50: "rgba(76,125,255,0.14)",
        },
        // Secondary accent — teal. Used sparingly: focus rings on non-primary
        // controls, a few icon chips, chart highlight.
        accent: {
          DEFAULT: "#2DD4BF",
          hover: "#22B8A6",
          50: "rgba(45,212,191,0.14)",
        },

        // Semantic (data) colors — conventional on purpose, so meaning is
        // legible at a glance. Values tuned to sit on dark glass, not white.
        positive: { DEFAULT: "#34D399", bg: "rgba(52,211,153,0.14)" },
        negative: { DEFAULT: "#FB7185", bg: "rgba(251,113,133,0.14)" },
        neutral: { DEFAULT: "#94A3B8", bg: "rgba(148,163,184,0.14)" },
        warning: { DEFAULT: "#FBBF24", bg: "rgba(251,191,36,0.14)" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.625rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(76,125,255,0.15), 0 8px 30px -8px rgba(76,125,255,0.45)",
        "glow-lg": "0 0 0 1px rgba(76,125,255,0.18), 0 16px 48px -12px rgba(76,125,255,0.55)",
        "glow-accent": "0 0 0 1px rgba(45,212,191,0.15), 0 8px 24px -8px rgba(45,212,191,0.4)",
        card: "0 4px 24px -8px rgba(0,0,0,0.5)",
        "card-lg": "0 12px 48px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #4C7DFF 0%, #8B5CF6 100%)",
        "gradient-radial-primary":
          "radial-gradient(circle at center, rgba(76,125,255,0.16) 0%, rgba(76,125,255,0) 70%)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        float: "float 5s ease-in-out infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
