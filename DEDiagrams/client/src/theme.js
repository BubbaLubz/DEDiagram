import useStore from './store';

export const LIGHT = {
  bg:      '#F0EBE3',
  surface: '#EDE9E2',
  card:    '#E8E2DA',
  hover:   '#E5DDD4',
  deeper:  '#CCC5BC',
  text:    '#1C1814',
  muted:   '#7A726A',
  faint:   '#B0A89E',
  divider: '#D9D3CB',
  amber:   '#B87040',
  danger:  '#B03A2E',
  canvas:  '#F5F0E8',
  input:   '#F7F4EF',
};

export const DARK = {
  bg:      '#1c2028',
  surface: '#22272e',
  card:    '#2d333b',
  hover:   '#373e47',
  deeper:  '#444c56',
  text:    '#cdd9e5',
  muted:   '#8b949e',
  faint:   '#545d68',
  divider: '#373e47',
  amber:   '#e3a854',
  danger:  '#f47067',
  canvas:  '#161b22',
  input:   '#2d333b',
};

export function useTheme() {
  const darkMode = useStore(s => s.darkMode);
  return darkMode ? DARK : LIGHT;
}
