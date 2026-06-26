import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";

type LogoProps = {
  href?: string;
  /** texto auxiliar à direita do nome (ex. versão) */
  meta?: string;
  className?: string;
};

/** Marca AccessCheck: selo com check em gradiente + wordmark. */
export function Logo({ href = "/", meta, className }: LogoProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span className="ac-focusring flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-400 to-brand-600 text-white shadow-soft">
        <FontAwesomeIcon icon={faCheck} className="text-base" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-ink">AccessCheck</span>
      {meta && (
        <span className="ml-0.5 border-l border-line-strong pl-2.5 font-mono text-[11px] text-muted">
          {meta}
        </span>
      )}
    </Link>
  );
}
