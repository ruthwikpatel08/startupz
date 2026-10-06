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
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5', // HookZ primary indigo from Landing Page
          700: '#4338CA', // HookZ primary hover
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        slate: {
          50: '#F9FAFB', // Landing page tile background
          100: '#F3F4F6',
          200: '#E5E7EB', // Landing page border (#e5e7eb)
          300: '#D1D5DB', // Landing page input border (#d1d5db)
          400: '#9CA3AF',
          500: '#6B7280', // Landing page muted text (#6b7280)
          600: '#4B5563',
          700: '#374151', // Landing page secondary text (#374151)
          800: '#1F2937',
          900: '#111827', // Landing page primary text (#111827)
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
