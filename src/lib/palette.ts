export const PALETTE = {
  canvas: "#f6eedd",
  surface: "#fffcf4",
  band: "#efe4cd",
  code: "#f2e9d6",
  booth: "#e9d7b4",
  ink: "#151f47",
  "ink-2": "#2f3a5c",
  body: "#3d4766",
  muted: "#525a70",
  disabled: "#8c8f99",
  hairline: "#e6d9bf",
  border: "#cfbf9c",
  rule: "#8e7f63",
  critical: "#da2218",
  "critical-hatch": "#f39a8f",
  serious: "#bf4900",
  "serious-hatch": "#f6ae6a",
  moderate: "#916800",
  "moderate-text": "#7a5800",
  "moderate-hatch": "#e8c55a",
  verified: "#008046",
  review: "#824ee9",
  path: "#2c64f2",
  steel: "#2d5486",
} as const;

export type PaletteToken = keyof typeof PALETTE;

export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
