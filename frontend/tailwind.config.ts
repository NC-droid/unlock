import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // UNLOCK Brand Colors
        primary: {
          DEFAULT: '#00A8A8',
          dark: '#007C7C',
          light: '#B8E6E6',
        },
        secondary: {
          DEFAULT: '#1A3A52',
        },
        success: {
          DEFAULT: '#FFB81C',
          dark: '#FFA500',
        },
        growth: {
          DEFAULT: '#7FD856',
        },
        error: {
          DEFAULT: '#FF6B6B',
        },
        warning: {
          DEFAULT: '#FFB81C',
        },
        // Neutral
        'bg-primary': '#FFFFFF',
        'bg-secondary': '#F8F9FA',
        'bg-tertiary': '#F0F2F5',
        'text-primary': '#1A1A1A',
        'text-secondary': '#666666',
        'text-tertiary': '#999999',
        'border-color': '#E0E0E0',
        'border-light': '#F0F0F0',
      },
      fontFamily: {
        heading: ['Poppins', 'Segoe UI', 'sans-serif'],
        body: ['Inter', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Monaco', 'monospace'],
      },
      fontSize: {
        h1: ['32px', { lineHeight: '1.2', fontWeight: '600' }],
        h2: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        h3: ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        h4: ['18px', { lineHeight: '1.5', fontWeight: '500' }],
        body: ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        small: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        xs: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
        modal: '0 10px 40px rgba(0, 0, 0, 0.2)',
        'btn-primary': '0 4px 12px rgba(0, 168, 168, 0.3)',
        'btn-success': '0 4px 12px rgba(255, 184, 28, 0.3)',
        'badge': '0 4px 16px rgba(255, 184, 28, 0.4)',
      },
      transitionTimingFunction: {
        'out-quad': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'in-out-quad': 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
      },
      keyframes: {
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.5) rotateZ(-10deg)' },
          '70%': { opacity: '1', transform: 'scale(1.1) rotateZ(0deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotateZ(0deg)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(127, 216, 86, 0.5)' },
          '50%': { boxShadow: '0 0 16px rgba(127, 216, 86, 0.8)' },
        },
        slideInBottom: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'pop-in': 'popIn 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'glow': 'glow 2s ease-in-out infinite',
        'slide-in-bottom': 'slideInBottom 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'fade-in': 'fadeIn 200ms ease-in',
      },
      maxWidth: {
        'content-sm': '600px',
        'content-md': '900px',
      },
    },
  },
  plugins: [],
}

export default config
