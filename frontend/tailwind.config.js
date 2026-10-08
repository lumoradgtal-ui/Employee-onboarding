/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#5B45A5',
        dark: '#453487',
        light: '#F1EEFA',
        background: '#F8F9FC',
        card: '#FFFFFF',
        text: '#202124',
        secondary: '#667085',
        border: '#E6E8EF',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC3545',
        info: '#2563EB',
      }
    },
  },
  plugins: [],
}
