/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'Courier New', 'monospace'],
      },
      colors: {
        bg: '#fafaf8',
        fg: '#0a0a0a',
        muted: '#8a8a8a',
        border: '#e0e0e0',
        accent: '#0066ff',
        green: '#00cc66',
        red: '#ff3344',
        dark: '#0a0a0a',
      },
    },
  },
  plugins: [],
}
