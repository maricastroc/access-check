import type { ReactNode } from "react";
import type { FindingView, QueueGroup } from "@/lib/report/findings";
import type { Standing } from "@/lib/report/standing";
import { STANDING_LABEL, STANDING_NOTE } from "@/lib/report/standing";
import type { Translate } from "@/lib/i18n/t";
import { cn } from "@/lib/cn";
import { Tag, sevOf } from "./notation";
import type { FindingGroups } from "./finding-list";

const STANDING_SEV: Record<Standing, "critical" | "serious" | "moderate" | "none"> = {
  blocked: "critical",
  failing: "serious",
  gaps: "moderate",
  clean: "none",
};

export function StandingMark({ standing, size = 16 }: { standing: Standing; size?: number }) {
  return (
    <span
      aria-hidden
      data-sev={STANDING_SEV[standing]}
      style={{ width: size, height: size }}
      className={cn(
        "block shrink-0 border-2 border-(--sev-ink)",
        standing === "clean" ? "bg-verified" : "ac-hatch",
      )}
    />
  );
}

export function Summary({
  standing,
  groups,
  passed,
  selectedId,
  onSelect,
  onHover,
  heading: Heading = "h1",
  headingId,
  host,
  t,
  compact = false,
  checkNote,
  children,
}: {
  standing: Standing;
  groups: FindingGroups;
  passed: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
  heading?: "h1" | "h2";
  headingId: string;
  host: string;
  t: Translate;
  compact?: boolean;
  checkNote?: string;
  children?: ReactNode;
}) {
  const of = (g: QueueGroup) => groups.find((x) => x.group === g)?.findings ?? [];
  const toFix = of("fix");
  const toCheck = of("check");
  const recs = of("recommend").length;

  const line = (label: string, list: FindingView[], big: boolean) =>
    list.length > 0 && (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          className={cn(
            "tracking-[-0.01em] tabular-nums",
            big
              ? cn("font-bold", compact ? "text-[19px]" : "text-[21px]")
              : "text-[16px] font-semibold",
          )}
        >
          {label}
        </span>
        <span className="flex flex-wrap gap-1" role="list" aria-label={t("summary.index")}>
          {list.map((f) => (
            <span role="listitem" key={f.id}>
              <button
                type="button"
                aria-label={`${f.n}. ${f.title}`}
                aria-current={f.id === selectedId ? "true" : undefined}
                onClick={() => onSelect(f.id)}
                onMouseEnter={() => onHover?.(f.id)}
                onMouseLeave={() => onHover?.(null)}
                onFocus={() => onHover?.(f.id)}
                onBlur={() => onHover?.(null)}
                className="flex min-h-6 min-w-6 cursor-pointer items-center justify-center"
              >
                <Tag n={f.n} sev={sevOf(f)} size={big ? 24 : 22} selected={f.id === selectedId} />
              </button>
            </span>
          ))}
        </span>
      </div>
    );

  return (
    <div>
      <Heading
        id={headingId}
        className={cn(
          "flex items-center gap-2.5 leading-[1.05] font-bold tracking-[-0.02em] text-ink",
          compact ? "text-[24px]" : "text-[32px]",
        )}
      >
        <StandingMark standing={standing} size={compact ? 16 : 20} />
        <span>
          <span className="sr-only">{host}: </span>
          {t(STANDING_LABEL[standing])}
        </span>
      </Heading>
      <p
        className={cn(
          "max-w-[46ch] leading-normal text-ink-2",
          compact ? "mt-1.5 text-[14px]" : "mt-2.5 text-[15px]",
        )}
      >
        {t(STANDING_NOTE[standing])}
      </p>
      {(toFix.length > 0 || toCheck.length > 0) && (
        <div className={cn("space-y-2", compact ? "mt-4" : "mt-6")}>
          {line(t("panel.toFix", { count: toFix.length }), toFix, true)}
          {line(t("panel.toCheck", { count: toCheck.length }), toCheck, false)}
          {checkNote && <p className="text-[13px] text-muted">{checkNote}</p>}
        </div>
      )}
      <p className="mt-3 text-[13.5px] text-muted">
        {[
          recs > 0 ? t("summary.recommendations", { count: recs }) : null,
          t("summary.passed", { count: passed }),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {children}
    </div>
  );
}
