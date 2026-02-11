// Various colours (from Plotly).

export const PALETTE: Record<string, string> = {
  '#4e79a7': 'Blue',
  '#f28e2b': 'Orange',
  '#e15759': 'Red',
  '#76b7b2': 'Teal',
  '#59a14f': 'Green',
  '#edc948': 'Yellow',
  '#b07aa1': 'Purple',
  '#ff9da7': 'Pink',
  '#9c755f': 'Brown',
  '#bab0ac': 'Gray'
};

export const REVERTED_PALETTE: Record<string, string> = Object.fromEntries(
  Object.entries(PALETTE).map(([hex, name]) => [name, hex])
);

export const PALETTE_COLORS = Object.keys(PALETTE);
export const DEFAULT_COLOR = '#4e79a7'; // Default colour (blue)
