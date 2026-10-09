import Link from "next/link";
import { cn } from "@/lib/cn";
import { BrandMark } from "./brand-mark";

export { BrandMark };

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
