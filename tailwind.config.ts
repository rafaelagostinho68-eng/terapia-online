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
        cream: {
          50: "#FDFAF5",
          100: "#F8F2E6",
          200: "#F0E6D3",
          DEFAULT: "#F5EFE6",
        },
        sage: {
          50: "#EFF4EE",
          100: "#D8E8D5",
          200: "#B4D1AE",
          300: "#8BB882",
          400: "#6A9F61",
          500: "#4A6741",
          600: "#3D5636",
          700: "#30452A",
          800: "#22321E",
          900: "#152012",
          DEFAULT: "#4A6741",
        },
        terracotta: {
          50: "#FDF5EE",
          100: "#FAEADA",
          200: "#F4D0B0",
          300: "#EDB07F",
          400: "#E4894A",
          500: "#C4956A",
          600: "#A67650",
          DEFAULT: "#C4956A",
        },
        charcoal: {
          DEFAULT: "#2C2C2C",
          light: "#4A4A4A",
          muted: "#7A7A7A",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
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
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
