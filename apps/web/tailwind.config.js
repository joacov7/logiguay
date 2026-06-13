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
        // Remap blue → verde agrícola #15A66A para aplicar el color primario
        // a todo el sistema sin cambiar clases existentes (bg-blue-600, text-blue-*, etc.)
        blue: {
          50:  '#f0faf5',
          100: '#dcf5e8',
          200: '#b8ebd1',
          300: '#7dd4aa',
          400: '#42bc82',
          500: '#20b375',
          600: '#15A66A',
          700: '#108a57',
          800: '#0d6e46',
          900: '#0a5236',
          950: '#062e21',
        },
        brand: {
          50:  '#f0faf5',
          100: '#dcf5e8',
          500: '#20b375',
          600: '#15A66A',
          700: '#108a57',
          900: '#0a5236',
        },
        logiguay: {
          green:  '#15A66A',
          orange: '#F2870D',
          dark:   '#0A1633',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
