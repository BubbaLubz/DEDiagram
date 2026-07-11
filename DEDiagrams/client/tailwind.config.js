/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas:       '#171310',  // workspace canvas — always-dark timber-at-night
        surface:      '#E7DFD0',  // plaster surface — sidebars / panels
        panel:        '#E0D6C4',  // plaster card — toolbar / inner cards
        border:       '#D2C6AF',  // board-seam divider
        accent:       '#B87040',  // honey oak
        accentHover:  '#9B5F36',  // cedar-leaning hover state
        pinePale:     '#D9BE95',
        cedarDeep:    '#7A5233',
        sumiCharcoal: '#2B2926',
        hallwayConcrete: '#A3A099',
        cortenRust:   '#A3502B',
        moss:         '#5C7A4A',
        washiPaper:   '#F7F2E7',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
