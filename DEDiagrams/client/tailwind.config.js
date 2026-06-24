/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas:      '#1A1714',  // warm dark — diagram background
        surface:     '#F0EBE3',  // warm light — sidebars / panels
        panel:       '#EDE9E2',  // warm cream — toolbar / inner cards
        border:      '#D9D3CB',  // warm divider
        accent:      '#B87040',  // warm amber
        accentHover: '#9B6230',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
