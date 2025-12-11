/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Primary Accent
        lime: {
          DEFAULT: '#ABF43F',
          hover: '#9DE035',
          muted: 'rgba(171, 244, 63, 0.15)',
          dark: '#4A7B1A', // Darker lime for light mode text - better contrast
          'dark-hover': '#3D6615',
        },
        // Secondary Accent
        cyan: {
          DEFAULT: '#3FF4E5',
          hover: '#2DE0D2',
          muted: 'rgba(63, 244, 229, 0.15)',
          dark: '#0D7377', // Darker cyan for light mode text - better contrast
          'dark-hover': '#095A5E',
        },
        // Dark Theme
        dark: {
          950: '#0A0A0A',
          900: '#0D0D0D',
          800: '#141414',
          700: '#1A1A1A',
          600: '#222222',
          500: '#2A2A2A',
          400: '#333333',
          border: '#2A2A2A',
        },
        // Light Theme
        light: {
          50: '#FFFFFF',
          100: '#FAFAFA',
          200: '#F5F5F5',
          300: '#EEEEEE',
          400: '#E0E0E0',
          500: '#BDBDBD',
          600: '#9E9E9E',
          border: '#E5E5E5',
        },
        // Grays
        gray: {
          100: '#E5E5E5',
          200: '#CCCCCC',
          300: '#999999',
          400: '#6B6B6B',
          500: '#4A4A4A',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'lime-glow': '0 0 20px rgba(171, 244, 63, 0.3)',
        'cyan-glow': '0 0 20px rgba(63, 244, 229, 0.3)',
        'sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.4)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.5)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px #ABF43F, 0 0 10px #ABF43F, 0 0 15px #ABF43F' },
          '50%': { boxShadow: '0 0 10px #ABF43F, 0 0 20px #ABF43F, 0 0 30px #ABF43F' },
        },
      },
      backgroundImage: {
        'gradient-lime': 'linear-gradient(135deg, #ABF43F 0%, #3FF4E5 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0D0D0D 0%, #090909 100%)',
      },
      spacing: {
        'sidebar': '260px',
        'sidebar-collapsed': '72px',
      },
    },
  },
  plugins: [],
}
