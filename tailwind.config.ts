import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#f3f4f2",
        ink: "#0f1112",
        accent: "#8b5cf6",
        accentDark: "#7c3aed",
      },
      boxShadow: {
        soft: "0 18px 48px rgba(17, 24, 39, 0.12)",
      },
      fontFamily: {
        sans: ['"Poppins"', '"Segoe UI"', '"Noto Sans"', '"Helvetica Neue"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
