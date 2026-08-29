/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        surface: {
          DEFAULT: "var(--color-surface)",
          raised: "var(--color-surface-raised)",
          muted: "var(--color-surface-muted)",
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          muted: "var(--color-ink-muted)",
          faint: "var(--color-ink-faint)",
        },
        line: {
          DEFAULT: "var(--color-line)",
          strong: "var(--color-line-strong)",
        },
        signal: {
          DEFAULT: "var(--color-signal)",
          soft: "var(--color-signal-soft)",
        },
        copper: {
          DEFAULT: "var(--color-copper)",
          soft: "var(--color-copper-soft)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          soft: "var(--color-info-soft)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          soft: "var(--color-warning-soft)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          soft: "var(--color-danger-soft)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "DM Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
      },
    },
  },
  plugins: [],
};
