/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background-rgb) / <alpha-value>)",
        foreground: "rgb(var(--foreground-rgb) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card-rgb) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground-rgb) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover-rgb) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground-rgb) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "rgb(var(--sidebar-rgb) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary-rgb) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground-rgb) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary-rgb) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground-rgb) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted-rgb) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground-rgb) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive-rgb) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground-rgb) / <alpha-value>)",
        },
        border: "rgb(var(--border-rgb) / <alpha-value>)",
        input: "rgb(var(--input-rgb) / <alpha-value>)",
        ring: "rgb(var(--ring-rgb) / <alpha-value>)",
        "notion-gray": {
          text: "var(--notion-gray-text)",
          bg: "var(--notion-gray-bg)",
        },
        "notion-brown": {
          text: "var(--notion-brown-text)",
          bg: "var(--notion-brown-bg)",
        },
        "notion-orange": {
          text: "var(--notion-orange-text)",
          bg: "var(--notion-orange-bg)",
        },
        "notion-yellow": {
          text: "var(--notion-yellow-text)",
          bg: "var(--notion-yellow-bg)",
        },
        "notion-green": {
          text: "var(--notion-green-text)",
          bg: "var(--notion-green-bg)",
        },
        "notion-blue": {
          text: "var(--notion-blue-text)",
          bg: "var(--notion-blue-bg)",
        },
        "notion-purple": {
          text: "var(--notion-purple-text)",
          bg: "var(--notion-purple-bg)",
        },
        "notion-pink": {
          text: "var(--notion-pink-text)",
          bg: "var(--notion-pink-bg)",
        },
        "notion-red": {
          text: "var(--notion-red-text)",
          bg: "var(--notion-red-bg)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        serif: ["var(--font-roboto-serif)", "Georgia", "Cambria", "serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "Consolas", "monospace"],
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
        "slide-in": "slide-in-from-right 0.2s ease-out",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-from-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
