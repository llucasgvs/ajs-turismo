import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EEF2FA",
          100: "#D5DFEF",
          200: "#A8BCD8",
          300: "#7B99C1",
          400: "#4E76AA",
          500: "#2A4A80",
          600: "#1E3464",
          700: "#152550",
          800: "#0D1838",
          900: "#070D20",
        },
        gold: {
          50: "#FFF9E6",
          100: "#FFF0BF",
          200: "#FFE080",
          300: "#FFD040",
          400: "#FFB800",
          500: "#F7A800",
          600: "#D4900B",
          700: "#B07808",
          800: "#8C6006",
          900: "#684803",
        },
        sky: {
          DEFAULT: "#87CEEB",
          light: "#B8E4F9",
          dark: "#5AB5D6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-montserrat)", "Montserrat", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #152550 0%, #1E3464 40%, #2A4A80 70%, #1E3464 100%)",
        "gold-gradient": "linear-gradient(135deg, #F7A800 0%, #FFB800 50%, #F7A800 100%)",
        "card-gradient": "linear-gradient(180deg, transparent 40%, rgba(21, 37, 80, 0.95) 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-in": "slideIn 0.5s ease-out forwards",
        "bounce-slow": "bounce 3s infinite",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(247, 168, 0, 0.4)" },
          "50%": { boxShadow: "0 0 0 15px rgba(247, 168, 0, 0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      boxShadow: {
        "card": "0 4px 24px rgba(30, 52, 100, 0.12)",
        "card-hover": "0 12px 40px rgba(30, 52, 100, 0.25)",
        "gold": "0 4px 20px rgba(247, 168, 0, 0.4)",
        "gold-hover": "0 8px 32px rgba(247, 168, 0, 0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
