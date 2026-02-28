import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        brand: {
          50: "#fef7ee",
          100: "#fdedd6",
          200: "#f9d7ac",
          300: "#f4ba77",
          400: "#ee9240",
          500: "#ea751d",
          600: "#db5b13",
          700: "#b54412",
          800: "#903617",
          900: "#742f16",
          950: "#3f1509",
        },
        surface: {
          900: "#0c0a09",
          800: "#141210",
          700: "#1c1917",
          600: "#292524",
          500: "#57534e",
        },
      },
      fontSize: {
        "display": ["1.875rem", { lineHeight: "1.2" }],
        "h1": ["1.5rem", { lineHeight: "1.3" }],
        "h2": ["1.125rem", { lineHeight: "1.35" }],
        "body": ["1rem", { lineHeight: "1.5" }],
        "small": ["0.875rem", { lineHeight: "1.45" }],
        "caption": ["0.75rem", { lineHeight: "1.4" }],
      },
      spacing: {
        "section": "1.5rem",
        "block": "1rem",
        "inline": "0.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out both",
        "slide-up": "slideUp 0.5s ease-out 0.1s both",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
