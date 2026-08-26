/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#141821",
          900: "#1B2130",
          800: "#262E42",
          700: "#333D57",
          500: "#5B6685",
          300: "#9AA3BD",
          100: "#E3E6EF",
        },
        paper: {
          DEFAULT: "#FBF9F4",
          100: "#F5F1E7",
        },
        seal: {
          DEFAULT: "#A8752E",
          light: "#C79447",
          dark: "#7C561F",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,24,33,0.04), 0 8px 24px -12px rgba(20,24,33,0.12)",
      },
    },
  },
  plugins: [],
};
