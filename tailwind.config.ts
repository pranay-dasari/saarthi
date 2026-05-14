import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        // Bump all sizes up — body text minimum 18px for elderly users
        sm:   ["0.9375rem", { lineHeight: "1.5" }],   // 15px
        base: ["1.125rem",  { lineHeight: "1.6" }],   // 18px ← minimum body
        lg:   ["1.25rem",   { lineHeight: "1.6" }],   // 20px
        xl:   ["1.375rem",  { lineHeight: "1.5" }],   // 22px
        "2xl":["1.625rem",  { lineHeight: "1.4" }],   // 26px
        "3xl":["2rem",      { lineHeight: "1.3" }],   // 32px ← headings
        "4xl":["2.5rem",    { lineHeight: "1.2" }],   // 40px
        "5xl":["3rem",      { lineHeight: "1.1" }],   // 48px
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      colors: {
        triage: {
          green:  "#16a34a",
          yellow: "#ca8a04",
          red:    "#dc2626",
          "green-bg":  "#f0fdf4",
          "yellow-bg": "#fefce8",
          "red-bg":    "#fef2f2",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
