import { cn } from "@/lib/cn";

function relativeLuminance(hex: string): number {
  const m = hex.replace("#", "");
  if (m.length !== 6) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** A flat color chip. Light colors get a hairline border so they read on ivory. */
export function ColorSwatch({
  hex,
  size = 18,
  className,
}: {
  hex: string;
  size?: number;
  className?: string;
}) {
  const light = relativeLuminance(hex) > 0.6;
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0", light && "border border-border", className)}
      style={{ width: size, height: size, background: hex }}
    />
  );
}
