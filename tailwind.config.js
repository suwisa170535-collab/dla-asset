/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c3d9eb',
          300: '#95bedd',
          400: '#609ecc',
          500: '#3c82b8',
          600: '#2b689a',
          700: '#23537d',
          800: '#204667',
          900: '#1e3c56',
          950: '#142738',
        },
        gold: {
          50: '#fbf8eb',
          100: '#f5eece',
          200: '#ecdc9e',
          300: '#e0c466',
          400: '#d4aa38',
          500: '#bc8e20',
          600: '#9b6c17',
          700: '#754b15',
          800: '#633e18',
          900: '#553419',
        }
      },
      fontFamily: {
        sans: ['Sarabun', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

