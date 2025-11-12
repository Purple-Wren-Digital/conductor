const plugin = require("tailwindcss/plugin");
const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.stories.{js,ts,jsx,tsx}",
  ],
  safelist: ["text-accessible-purple"],
  theme: {
    extend: {
      boxShadow: {
        focus: "0 0 0 2px #6D1C24",
      },
      colors: {
        conductorDarker: "#4B1D22",
        conductor: "#6D1C24",
        conductorLight: "#8C464D",
        red: "#de2454",
        purple: "#573ba3",
        purpleDarker: "#43206F",
        eggplant: "#2b0f42",
        beige: "#fff1e6",
        mint: "#167978",
        mint_light: "#DCEDED",
        lavender: "#f8f5ff",
        yellow: "#fce300",

        dark: "#2c293b",
        default: "#747279",
        placeholder: "#bbbabe",
        light: "#cecdd1",
        lighter: "#eae9ed",
        lightest: "#efeef2",
        white: "white",
        paper: "#fcf7ee",

        primary_900: "#6D1C24",
        primary_700: "#7B2F37",
        primary_500: "#8C464D",
        primary_300: "#A2646A",
        primary_100: "#B39194",

        structure: {
          dark: "#2c293b",
          base: "#747279",
          default: "#747279",
          placeholder: "#bbbabe",
          light: "#cecdd1",
          lighter: "#eae9ed",
          lightest: "#efeef2",
          white: "#ffffff",
        },
        action: {
          primary: "#de2454",
          secondary: "#573ba3",
        },
        alert: {
          negative: "#de2454",
          positive: "#167978",
        },
        accent: {
          mint: "#167978",
          purpleDarker: "#2b0f42",
          beige: "#fff1e6",
          powderBlue: "#e7f1ff",
          sale: "#cf0c3b",
        },
        accessible: {
          purple: "#6747BD",
          dark: "#0B0A0F",
        },
      },
      fontFamily: {
        serif: ["var(--font-gt-super)"],
        sans: ["var(--font-ibm-plex-sans)"],
        inter: ["var(--font-inter-latin"],
      },
      letterSpacing: {
        tight: ".2px",
      },
    },
    screens: {
      xs: "475px",
      ...defaultTheme.screens,
    },
    keyframes: {
      // logo animation
      shrink: {
        from: { width: "222px", left: "0", top: "8px" },
        to: { width: "108px", left: "140px", top: "32px" },
      },
      // affiliation animation
      fadeIn: {
        "70%": { opacity: "0" },
        "100%": { opacity: "100%" },
      },
      fadeOut: {
        "0%": { opacity: "100%" },
        "100%": { opacity: "0" },
      },
      rotate: {
        90: "90deg",
      },
    },
    animation: {
      // logo animation
      shrink: "shrink 0.8s normal forwards ease-in-out",
      // affiliation animation
      fadeIn: "fadeIn 0.8s normal forwards ease-in-out",
      fadeOut: "fadeOut 0.8s normal 4s forwards ease-in-out",
      spin: "loader-rotate 1s linear infinite",
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
