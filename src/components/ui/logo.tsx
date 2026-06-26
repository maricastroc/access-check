import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";

type LogoProps = {
  href?: string;
  meta?: string;
  className?: string;
};

export function Logo({ href = "/", meta, className }: LogoProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/lockup-horizontal.svg"
        alt="AccessCheck"
        width={101}
        height={28}
        priority
        className="h-7 w-auto"
      />
      {meta && (
        <span className="ml-0.5 border-l border-line-strong pl-2.5 font-mono text-[11px] text-muted">
          {meta}
        </span>
      )}
    </Link>
  );
}
