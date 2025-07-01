// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",  // adjust if needed
  ],
  theme: {
    extend: {
      colors: {
        iamcfo: {
          blue: "#3CA9E0",
          dark: "#2B91C0",
          green: "#10B981",   // Success
          red: "#EF4444",     // Danger
          text: "#111827",    // Main text
          muted: "#6B7280",   // Secondary text
          background: "#F9FAFB"
        },
      },
    },
  },
  plugins: [],
};
