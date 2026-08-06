/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        aqua: {
          950: '#0b0f10',
          900: '#101415',
          850: '#15191a',
          800: '#191c1e',
          700: '#272a2c',
          600: '#323537',
        },
        cyan: {
          400: '#00f2ff',
          500: '#00dbe7',
          600: '#00b4bf',
        },
        teal: {
          300: '#97f1f7',
          400: '#7ad5db',
          500: '#00797f',
          800: '#00373a',
          900: '#002022',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Geist', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'water-flow': 'waterFlow 12s infinite linear',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(0, 242, 255, 0.2)' },
          '50%': { boxShadow: '0 0 24px rgba(0, 242, 255, 0.45)' },
        },
        waterFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        }
      }
    },
  },
  plugins: [],
}
