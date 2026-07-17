/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: [
          "Poppins",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        primary: {
          DEFAULT: "#e91e63",
          dark: "#c2185b",
          light: "#f8bbd9",
        },
        secondary: "#9c27b0",
        accent: "#ff4081",
        success: "#4caf50",
        warning: "#ff9800",
        error: "#f44336",
        dark: "#1a1a2e",
        gray: {
          50: "#f9fafb",
          100: "#f8f9fa",
          200: "#e9ecef",
          300: "#dee2e6",
          400: "#ced4da",
          500: "#adb5bd",
          600: "#6c757d",
          700: "#495057",
          800: "#343a40",
          900: "#212529",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "20px",
        xl: "30px",
      },
      boxShadow: {
        sm: "0 2px 4px rgba(0,0,0,0.05)",
        md: "0 4px 12px rgba(0,0,0,0.1)",
        lg: "0 8px 24px rgba(0,0,0,0.12)",
        xl: "0 12px 48px rgba(0,0,0,0.15)",
      },
      transitionTimingFunction: {
        custom: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        slideInUp: {
          from: { transform: "translateY(100px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(50px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        skeletonLoading: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        slideInUp: "slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        slideUp: "slideUp 0.3s ease",
        fadeIn: "fadeIn 0.3s ease",
        skeleton: "skeletonLoading 1.5s infinite",
      },
    },
  },
  plugins: [],
};
