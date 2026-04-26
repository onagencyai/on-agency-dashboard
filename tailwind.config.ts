import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        base: "var(--bg-base)",
        card: "var(--bg-card)",
        subtle: "var(--bg-subtle)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
      },
      spacing: {
        sidebar: "216px",
        header: "52px",
      },
      borderRadius: {
        card: "10px",
        badge: "6px",
        btn: "7px",
      },
    },
  },
  plugins: [],
};
export default config;
