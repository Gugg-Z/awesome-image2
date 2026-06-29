import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17202A",
        mist: "#F5F8FA",
        line: "#E5EBEF",
        brand: {
          50: "#E9FBF8",
          100: "#C9F4EE",
          500: "#16B8A6",
          600: "#0B8F82",
          700: "#08746B"
        },
        ocean: {
          500: "#288BEA",
          600: "#176FD1"
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(23, 32, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
