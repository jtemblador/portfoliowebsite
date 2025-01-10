/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        glow: {
          '0%, 100%': { textShadow: '0 0 10px rgba(72, 199, 116, 0.8)' },
          '50%': { textShadow: '0 0 20px rgba(72, 199, 116, 1)' },
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
        glow: 'glow 1s ease-in-out infinite',
        slideFadeIn: 'slideFadeIn 0.5s ease-out',
        bounceOnce: 'bounceOnce 0.5s ease-out',
      },
    },
  },
  plugins: [],
}
