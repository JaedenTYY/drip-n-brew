import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        // You can add brand-specific colors here if needed
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
