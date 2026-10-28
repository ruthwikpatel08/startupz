/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: { xs: '475px' },
      colors: {
        brand: { 50: '#f5f1ff', 100: '#ebe2ff', 200: '#d9c9ff', 300: '#c1a5ff', 400: '#a98aff', 500: '#8c63f4', 600: '#7047eb', 700: '#5b32cf', 800: '#4828a3', 900: '#392478', 950: '#24163f' },
        slate: { 50: '#f7f7fb', 100: '#eeedf5', 200: '#e4e1ed', 300: '#cfcadf', 400: '#9690a8', 500: '#716c83', 600: '#555168', 700: '#413b53', 800: '#302a40', 900: '#201d32', 950: '#121019' },
        dark: { 50: '#f4f1fc', 100: '#eeedf5', 600: '#555168', 700: '#413b53', 750: '#363044', 800: '#2b2639', 850: '#231e30', 900: '#1b1825', 950: '#121019' },
        accent: '#d5f478', secondary: '#e8b8a2',
        success: { 50: '#ecf9f1', 600: '#18734e', 700: '#105c3c' },
        warning: { 50: '#fff7df', 600: '#936314', 700: '#755011' },
        error: { 50: '#fff0f3', 600: '#c13450', 700: '#a02440' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { sm: '6px', DEFAULT: '8px', md: '10px', lg: '12px', xl: '16px', '2xl': '24px', '3xl': '32px' },
      boxShadow: { subtle: 'var(--shadow-sm)', elevated: 'var(--shadow-md)', modal: 'var(--shadow-lg)' },
      transitionDuration: { DEFAULT: '160ms', subtle: '160ms' },
      transitionTimingFunction: { spring: 'var(--ease-spring)' },
      animation: { 'fade-in': 'fadeIn .35s var(--ease-out)' },
      keyframes: { fadeIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } } },
    },
  },
  plugins: [],
};
