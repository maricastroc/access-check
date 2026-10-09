export const PALETTE = {
  canvas: "#f6f5f1",
  surface: "#fffefc",
  band: "#e9edf5",
  code: "#eef1f6",
  booth: "#dde2eb",
  ink: "#131c45",
  "ink-2": "#2c3659",
  body: "#384263",
  muted: "#4e566e",
  disabled: "#868b9b",
  hairline: "#e0e3ea",
  border: "#c2c8d5",
  rule: "#78809a",
  critical: "#a3122f",
  "critical-text": "#a3122f",
  "critical-hatch": "#f09aab",
  serious: "#e85d6f",
  "serious-text": "#b8233f",
  "serious-hatch": "#f6b3be",
  moderate: "#f5b3bf",
  "moderate-text": "#a33a52",
  "moderate-hatch": "#f9d6db",
  verified: "#007843",
  review: "#7b48e0",
  "review-text": "#7043d4",
  path: "#2a5fe6",
  steel: "#2b4c88",
  accent: "#bf4900",
} as const;

export type PaletteToken = keyof typeof PALETTE;

export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
