/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Source Sans 3'", 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ["'Source Code Pro'", 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        stripe: {
          purple: '#533afd',
          'purple-hover': '#4434d4',
          'purple-deep': '#2e2b8c',
          'purple-light': '#b9b9f9',
          navy: '#061b31',
          label: '#273951',
          body: '#64748d',
          border: '#e5edf5',
          'border-purple': '#b9b9f9',
          'brand-dark': '#1c1e54',
          ruby: '#ea2261',
          magenta: '#f96bee',
          'magenta-light': '#ffd7ef',
          success: '#15be53',
          'success-text': '#108c3d',
          bg: '#ffffff',
          surface: '#f8fafc',
        },
      },
      boxShadow: {
        'stripe-sm': 'rgba(23,23,23,0.06) 0px 3px 6px',
        'stripe-md': 'rgba(23,23,23,0.08) 0px 15px 35px',
        'stripe-lg': 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px',
        'stripe-xl': 'rgba(3,3,39,0.25) 0px 14px 21px -14px, rgba(0,0,0,0.1) 0px 8px 17px -8px',
      },
      letterSpacing: {
        'tight-hero': '-1.4px',
        'tight-lg': '-0.96px',
        'tight-md': '-0.64px',
        'tight-sm': '-0.26px',
      },
    },
  },
  plugins: [],
}
