import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0B57D0",
        "primary-light": "#E7F1FF",
        "primary-gradient-from": "#4FA8FF",
        "primary-gradient-to": "#0B57D0",
        success: "#20A66A",
        surface: "#FFFFFF",
        "surface-alt": "#F7F9FC",
        ink: "#0B1B3A",
      },
      borderRadius: {
        card: "18px",
        control: "12px",
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
