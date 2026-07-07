import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      // breakpoint real del prototipo aprobado (no el 768/1024 de DESIGN.md)
      mobile: { max: "919px" },
      sm: "480px",
      md: "768px",
      lg: "920px",
      xl: "1280px",
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1A2C4E",
          dark: "#12203A",
          light: "#243d6b",
        },
        sidebar: {
          from: "#192C4C",
          to: "#14233D",
        },
        gold: {
          DEFAULT: "#C9A84C",
          dark: "#b8963d",
        },
        accent: "#22416E",
        surface: "#EEF1F5",
        line: "#E6E9EF",
        ink: {
          base: "#2D2D2D",
          muted: "#5A6473",
          faint: "#9AA3AF",
        },
        urgent: "#C0344B",
        success: "#2C6E4C",
      },
      fontFamily: {
        heading: ["var(--font-poppins)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        control: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
