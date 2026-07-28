/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0F1729',
        surface: '#F6F7FB',
        card: '#FFFFFF',
        primary: {
          DEFAULT: '#2952E3',
          50: '#EEF1FD',
          100: '#DCE3FB',
          500: '#2952E3',
          600: '#2140B8',
          700: '#1A3390',
        },
        accent: '#0FBF9F',
        warn: '#E0A02A',
        danger: '#DD4B4B',
        slate: {
          650: '#4B5568',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,41,0.04), 0 8px 24px -12px rgba(15,23,41,0.12)',
      },
    },
  },
  plugins: [],
};
