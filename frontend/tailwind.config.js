/** @type {import('tailwindcss').Config} */

// Colors are defined as CSS variables so the whole UI can switch between
// light and dark themes without editing component class names.
// Light values live on :root, dark values on .dark (see src/index.css).
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: v('--slate-50'),
          100: v('--slate-100'),
          200: v('--slate-200'),
          300: v('--slate-300'),
          400: v('--slate-400'),
          500: v('--slate-500'),
          600: v('--slate-600'),
          700: v('--slate-700'),
          800: v('--slate-800'),
          900: v('--slate-900'),
          950: v('--slate-950'),
        },
        indigo: {
          100: v('--indigo-100'),
          200: '#c7d2fe',
          300: v('--indigo-300'),
          400: v('--indigo-400'),
          500: '#6366f1',
          600: '#4f46e5',
        },
        amber: {
          300: v('--amber-300'),
          400: v('--amber-400'),
          500: '#f59e0b',
          600: '#d97706',
        },
        emerald: {
          300: v('--emerald-300'),
          400: v('--emerald-400'),
          500: '#10b981',
          600: '#059669',
        },
        sky: {
          400: v('--sky-400'),
          500: '#0ea5e9',
          600: '#0284c7',
        },
        rose: {
          300: v('--rose-300'),
          400: v('--rose-400'),
          500: '#f43f5e',
          600: '#e11d48',
        },
        orange: {
          400: v('--orange-400'),
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        }
      }
    },
  },
  plugins: [],
}
