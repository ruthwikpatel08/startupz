/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF4FF',
          100: '#DBE7FE',
          200: '#BFD5FE',
          300: '#93BAFD',
          400: '#6094FA',
          500: '#3B75F3',
          600: '#2457D6', // StartupZ primary brand color
          700: '#1D4ED8', // StartupZ primary hover
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        slate: {
          50: '#F8F9FB', // Primary app background
          100: '#F2F4F7',
          200: '#E4E7EC', // Standard border
          300: '#D0D5DD',
          400: '#98A2B3', // Muted text
          500: '#667085', // Secondary text
          600: '#475467',
          700: '#344054',
          800: '#1D2939',
          900: '#181A1F', // Primary text
          950: '#0B0F17',
        },
        dark: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          800: '#1E2536',
          850: '#141A26',
          900: '#0F1420',
          950: '#0B0F17',
        },
        success: {
          50: '#F0FDF4',
          600: '#16803C',
          700: '#157032',
        },
        warning: {
          50: '#FEFCE8',
          600: '#B7791F',
          700: '#975A16',
        },
        error: {
          50: '#FEF2F2',
          600: '#C53030',
          700: '#9B2C2C',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '14px',
        '3xl': '16px',
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(16, 24, 40, 0.04)',
        'sm': '0 1px 2px rgba(16, 24, 40, 0.04)',
        'DEFAULT': '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.03)',
        'md': '0 4px 6px -1px rgba(16, 24, 40, 0.06), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
        'lg': '0 10px 15px -3px rgba(16, 24, 40, 0.06), 0 4px 6px -4px rgba(16, 24, 40, 0.03)',
        'xl': '0 20px 25px -5px rgba(16, 24, 40, 0.08), 0 8px 10px -6px rgba(16, 24, 40, 0.03)',
        'elevated': '0 4px 6px -1px rgba(16, 24, 40, 0.06), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
        'modal': '0 12px 28px -4px rgba(16, 24, 40, 0.12), 0 6px 12px -4px rgba(16, 24, 40, 0.06)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
        'subtle': '150ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
