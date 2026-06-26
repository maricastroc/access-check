import { cn } from "@/lib/cn";

type ScoreRingProps = {
  value: number;
  total?: number;
  size?: number;
  stroke?: number;
  className?: string;
};

export function ScoreRing({
  value,
  total = 100,
  size = 96,
  stroke = 8,
  className,
}: ScoreRingProps) {
  const r = 40 - stroke / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (value / total) * circumference;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="var(--color-brand-500)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl leading-none font-bold text-ink">{value}</span>
        <span className="text-[11px] text-muted">/ {total}</span>
      </div>
    </div>
  );
}
