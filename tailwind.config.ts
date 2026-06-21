import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      colors: {
        nexus: {
          bg: "#0A0A0F",
          card: "#13131A",
          hover: "#1C1C26",
          border: "#2A2A3A",
          muted: "#8A8AA0",
          text: "#E6E6F0",
        },
        accent: {
          blue: "#378ADD",
          green: "#1D9E75",
          orange: "#EF9F27",
          red: "#E24B4A",
          yellow: "#EDC54B",
        },
        // shadcn semantic tokens (mapped to NEXUS palette)
        background: "#0A0A0F",
        foreground: "#E6E6F0",
        card: "#13131A",
        "card-foreground": "#E6E6F0",
        popover: "#13131A",
        "popover-foreground": "#E6E6F0",
        primary: "#378ADD",
        "primary-foreground": "#FFFFFF",
        secondary: "#1C1C26",
        "secondary-foreground": "#E6E6F0",
        muted: "#1C1C26",
        "muted-foreground": "#8A8AA0",
        destructive: "#E24B4A",
        "destructive-foreground": "#FFFFFF",
        border: "#2A2A3A",
        input: "#2A2A3A",
        ring: "#378ADD",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(42,42,58,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(42,42,58,0.4) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(ellipse at top, rgba(55,138,221,0.18), transparent 60%)",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-8px)" },
          "40%, 80%": { transform: "translateX(8px)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(55,138,221,0.4)" },
          "50%": { boxShadow: "0 0 0 16px rgba(55,138,221,0)" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "bar-grow": {
          "0%": { width: "0%" },
          "100%": { width: "var(--bar-width)" },
        },
      },
      animation: {
        shake: "shake 0.45s ease-in-out",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "slide-in-right": "slide-in-right 0.5s ease-out forwards",
        "pulse-glow": "pulse-glow 2s ease-out infinite",
        "count-up": "count-up 0.8s ease-out forwards",
        "bar-grow": "bar-grow 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
