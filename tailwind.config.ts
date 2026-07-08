import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      mobile: { max: "919px" },
      sm: "480px",
      md: "768px",
      lg: "920px",
      xl: "1280px",
    },
    extend: {
      colors: {
        // Paleta real del prototipo Claude Design (actualizado 2026-07-08) —
        // coincide con DESIGN.md, reemplaza la paleta pastel de la v1.
        primary: {
          DEFAULT: "#1A2C4E",
          dark: "#12203A",
          light: "#243d6b",
        },
        gold: {
          DEFAULT: "#C9A84C",
          dark: "#b8963d",
          ink: "#15243C", // texto sobre fondo dorado (nav activo)
        },
        accent: "#2563EB",
        surface: "#F8F9FA",
        line: "#E2E8F0",
        "line-soft": "#F1F5F9",
        ink: {
          base: "#1E293B",
          muted: "#64748B",
          faint: "#94A3B8",
        },
        urgent: "#DC2626",
        warning: "#D97706",
        success: "#16A34A",
        info: "#2563EB",
      },
      fontFamily: {
        heading: ["var(--font-inter)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        card: "12px",
        control: "8px",
      },
    },
  },
  plugins: [],
};
export default config;
