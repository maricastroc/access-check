import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";

export type ConformanceLevel = {
  /** Rótulo do nível WCAG. */
  id: "A" | "AA" | "AAA";
  /** Preenchimento 0–100 (passa = 100). */
  value: number;
  passed: boolean;
};

/** Cor própria de cada nível — a escada também é assinatura de cor. */
const levelColor: Record<ConformanceLevel["id"], string> = {
  A: "var(--color-brand-300)",
  AA: "var(--color-brand-500)",
  AAA: "var(--color-success)",
};

type ConformanceLadderProps = {
  levels: ConformanceLevel[];
  className?: string;
};

/**
 * Escada de conformidade A → AA → AAA: barras ascendentes preenchidas até o
 * nível atingido. Elemento-assinatura do AccessCheck — só faz sentido em
 * acessibilidade, impossível de confundir com SEO/performance.
 */
export function ConformanceLadder({ levels, className }: ConformanceLadderProps) {
  // Nível mais alto totalmente aprovado vira o selo ("AA Ready").
  const reached = [...levels].reverse().find((l) => l.passed);

  return (
    <div className={cn("flex items-end gap-2.5", className)}>
      {levels.map((lvl, i) => {
        const isReached = reached?.id === lvl.id;
        const height = 52 + i * 26; // degraus ascendentes
        return (
          <div key={lvl.id} className="flex flex-1 flex-col items-center gap-2">
            {!lvl.passed && (
              <span className="text-[14px] leading-none font-bold text-ink">
                {lvl.value}
                <span className="text-[9px] font-semibold text-muted">%</span>
              </span>
            )}
            <div
              className={cn(
                "relative w-full overflow-hidden rounded-[10px] border border-line bg-canvas",
                isReached && "ac-focusring",
              )}
              style={{ height }}
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-[9px] transition-[height] duration-700 ease-out"
                style={{
                  height: `${lvl.value}%`,
                  background: levelColor[lvl.id],
                }}
              />
              {lvl.passed && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <FontAwesomeIcon icon={faCheck} className="text-sm text-white drop-shadow-sm" />
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-[12px] font-bold tracking-wide",
                isReached ? "text-brand-700" : "text-muted",
              )}
            >
              {lvl.id}
            </span>
          </div>
        );
      })}
    </div>
  );
}
