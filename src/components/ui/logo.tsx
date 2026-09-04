import Link from "next/link";
import { cn } from "@/lib/cn";

export function BrandMark({
  size = 23,
  tone = "ink",
  className,
}: {
  size?: number;
  tone?: "ink" | "steel";
  className?: string;
}) {
  const color = tone === "steel" ? "var(--color-steel)" : "var(--color-ink)";
  return (
    <svg
      width={Math.round((43 / 47.31) * size)}
      height={size}
      viewBox="0 0 43 47.31"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <path
        d="M35.52,11.91c-6.09-7.85-17.38-9.27-25.23-3.19S1.02,26.1,7.11,33.95c6.09,7.85,17.38,9.27,25.23,3.19,1.19-.92,2.26-2,3.19-3.19"
        strokeWidth={6.67}
        strokeMiterlimit={2.32}
      />
      <path d="M14.99,32.21l6.38-18.56,6.38,18.56" strokeWidth={5.8} strokeLinejoin="round" />
    </svg>
  );
}

type LogoProps = {
  href?: string;
  meta?: string;
  tone?: "ink" | "steel";
  className?: string;
};

export function Logo({ href = "/", meta, tone = "ink", className }: LogoProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 text-ink", className)}>
      <BrandMark size={23} tone={tone} />
      <span className="text-[19px] font-semibold tracking-[-0.01em]">AccessCheck</span>
      {meta && (
        <span className="ml-0.5 border-l border-border pl-2.5 font-mono text-[11px] text-muted">
          {meta}
        </span>
      )}
    </Link>
  );
}
