/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'glow-dark': {
          '0%, 100%': { 
            textShadow: '0 0 10px rgba(74, 222, 128, 0.8), 0 0 20px rgba(74, 222, 128, 0.6), 0 0 30px rgba(74, 222, 128, 0.4)'
          },
          '50%': { 
            textShadow: '0 0 20px rgba(74, 222, 128, 1), 0 0 30px rgba(74, 222, 128, 0.8), 0 0 40px rgba(74, 222, 128, 0.6)'
          },
        },
        'glow-light': {
          '0%, 100%': { 
            textShadow: '0 0 10px rgba(255, 0, 0, 0.8), 0 0 20px rgba(255, 0, 0, 0.6), 0 0 30px rgba(255, 0, 0, 0.4)'
          },
          '50%': { 
            textShadow: '0 0 20px rgba(255, 0, 0, 1), 0 0 30px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.6)'
          },
        },
        slideFadeIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceOnce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'glow-dark': 'glow-dark 1s ease-in-out infinite',
        'glow-light': 'glow-light 1s ease-in-out infinite',
        slideFadeIn: 'slideFadeIn 0.5s ease-out',
        bounceOnce: 'bounceOnce 0.5s ease-out',
      },
    },
  },
  plugins: [],
}