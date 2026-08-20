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
        primary: {
          50: '#EAF3FF',
          100: '#DCEEFF',
          200: '#B7D9FF',
          300: '#79BAFF',
          400: '#3A95FF',
          500: '#0969F9',
          600: '#0969F9',
          700: '#0055D9',
          800: '#002B63',
          900: '#001F4D',
        },
      },
    },
  },
  plugins: [],
}
