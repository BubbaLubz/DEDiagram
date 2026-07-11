import useStore from './store';

// Palette derived from two reference photographs of Japanese minimalist
// architecture — see DESIGN.md. Chrome (this file) follows the light/dark
// toggle; the canvas workspace (ComponentNode/LabeledEdge) deliberately does
// not — it stays permanently dark, per the Two-Palette Rule.
export const LIGHT = {
  bg:      '#F1EBDF', // plaster bg
  surface: '#E7DFD0', // plaster surface
  card:    '#E0D6C4', // plaster card
  hover:   '#D8CBB4',
  deeper:  '#C4B69C',
  text:    '#241F19', // ink
  muted:   '#7C7264',
  faint:   '#A79A87',
  divider: '#D2C6AF', // board seam
  amber:   '#B87040', // honey oak
  danger:  '#A23A2E',
  canvas:  '#F1EBDF',
  input:   '#F7F2E7', // washi paper
};

export const DARK = {
  bg:      '#1C1815', // plaster bg, dark
  surface: '#262019', // plaster surface, dark
  card:    '#322A21', // plaster card, dark
  hover:   '#3D3427',
  deeper:  '#4E4232',
  text:    '#E8DFD0', // ink, dark
  muted:   '#9C8F7C',
  faint:   '#6E6355',
  divider: '#453B2F', // board seam, dark
  amber:   '#E3A854', // honey oak, dark mode
  danger:  '#E8735F',
  canvas:  '#1C1815',
  input:   '#322A21',
};

export function useTheme() {
  const darkMode = useStore(s => s.darkMode);
  return darkMode ? DARK : LIGHT;
}
