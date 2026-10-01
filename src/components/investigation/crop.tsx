import type { ReactNode } from "react";
import type { Box } from "./notation";

export function Crop({
  src,
  page,
  box,
  maxW,
  maxH,
  pad = 28,
  label,
  children,
}: {
  src: string;
  page: { width: number; height: number };
  box: Box;
  maxW: number;
  maxH: number;
  pad?: number;
  label: string;
  children?: (inner: Box) => ReactNode;
}) {
  const px = {
    x: (box.left / 100) * page.width,
    y: (box.top / 100) * page.height,
    w: (box.width / 100) * page.width,
    h: (box.height / 100) * page.height,
  };
  const fitW = px.w + 2 * pad;
  const fitH = px.h + 2 * pad;
  let scale = Math.min(2, maxW / fitW, maxH / fitH);
  let rw = Math.min(fitW, page.width);
  if (scale < 1.2 && px.h < 90) {
    scale = Math.min(1.6, maxH / fitH);
    rw = Math.min(maxW / scale, page.width);
  }
  const rh = Math.min(fitH, maxH / scale, page.height);
  const x0 = Math.max(0, Math.min(px.x - pad, page.width - rw));
  const y0 = Math.max(0, Math.min(px.y + px.h / 2 - rh / 2, page.height - rh));
  const inner: Box = {
    left: ((px.x - x0) / rw) * 100,
    top: ((px.y - y0) / rh) * 100,
    width: (px.w / rw) * 100,
    height: (px.h / rh) * 100,
  };

  return (
    <div
      role="img"
      aria-label={label}
      className="relative max-w-full shrink-0 overflow-hidden outline -outline-offset-1 outline-hairline"
      style={{
        width: rw * scale,
        aspectRatio: `${rw} / ${rh}`,
        backgroundImage: `url(${src})`,
        backgroundSize: `${(page.width / rw) * 100}% auto`,
        backgroundPosition: `${(x0 / (page.width - rw || 1)) * 100}% ${(y0 / (page.height - rh || 1)) * 100}%`,
        backgroundRepeat: "no-repeat",
      }}
    >
      {children?.(inner)}
    </div>
  );
}
