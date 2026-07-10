/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0A0B0F',
        surface: '#14151B',
        'surface-raised': '#1B1D25',
        border: '#262832',
        'text-primary': '#F2F0E9',
        'text-secondary': '#8B8D97',
        accent: '#C9A961',
        'tier-strong': '#10b981',
        'tier-adequate': '#3b82f6',
        'tier-watch': '#f59e0b',
        'tier-high-risk': '#F43F5E',
        'text-muted': '#646670',
        'real-badge': '#0ea5e9',
        'stub-badge': '#94a3b8',
        'unconfirmed-badge': '#f59e0b',
      },
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
