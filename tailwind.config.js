/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        matrix: {
          orange: '#FF4500',
          'orange-light': '#FF6A35',
          'orange-dark': '#CC3700',
          bg: '#0A0A0A',
          surface: '#141414',
          card: '#1C1C1C',
          border: '#2A2A2A',
          'border-hover': '#3A3A3A',
          text: '#FFFFFF',
          muted: '#888888',
          subtle: '#555555',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
