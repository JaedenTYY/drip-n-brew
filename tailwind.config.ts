import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // You can add brand-specific colors here if needed
      },
    },
  },
  plugins: [],
}
