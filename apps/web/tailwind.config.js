/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        board: {
          light: '#f5deb3', // Wheat
          wood: '#d2b48c', // Tan wood
          dark: '#8b4513', // Saddle brown
          border: '#4a2e16',
          river: '#e6ccaa',
        },
        piece: {
          red: '#c53030',
          black: '#1a202c',
          redBg: '#fff5f5',
          blackBg: '#edf2f7',
        },
      },
      fontFamily: {
        calligraphy: ['"Noto Serif SC"', '"KaiTi"', 'serif'],
      },
    },
  },
  plugins: [],
};

