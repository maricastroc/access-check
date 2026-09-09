import type { FindingView } from "@/lib/report/findings";
import type { Verdict } from "@/lib/report/verdict";
import { severityColorVar, severityLabel } from "@/lib/report/severity";
import { SC_LEVEL } from "@/lib/report/wcag";
import { cn } from "@/lib/cn";
import type { Translate } from "@/lib/i18n/t";

function railColor(f: FindingView): string {
  if (f.severity) return severityColorVar[f.severity];
  return "var(--color-steel)";
}

function VerdictCue({ kind, t }: { kind: Verdict["kind"]; t: Translate }) {
  if (kind === "verified") return <span className="text-verified">{t("cue.verified")}</span>;
  if (kind === "partial") return <span className="text-moderate-text">{t("cue.partial")}</span>;
  if (kind === "sampled") return <span className="text-muted">{t("cue.sampled")}</span>;
  if (kind === "failed") return <span className="text-moderate-text">{t("cue.failed")}</span>;
  return null;
}

function TopTag({ f, t }: { f: FindingView; t: Translate }) {
  if (f.kind === "best-practice") {
    return (
      <span className="font-cond text-[11px] tracking-widest text-muted uppercase">
        {t("finding.kind.bestPractice")}
      </span>
    );
  }
  const level = f.criterionSc ? SC_LEVEL[f.criterionSc] : undefined;
  return (
    <span className="font-mono text-[12px] text-steel">
      {f.criterionSc ?? f.ruleId}
      {level ? ` ${level}` : ""}
    </span>
  );
}

export function FindingRow({
  finding,
  selected,
  onSelect,
  t,
}: {
  finding: FindingView;
  selected: boolean;
  onSelect?: () => void;
  t: Translate;
}) {
  const label = finding.severity
    ? severityLabel(finding.severity, t)
    : t("finding.kind.bestPractice");
  const noMarker = finding.markers.length === 0;
  const interactive = Boolean(onSelect);

  return (
    <button
      type="button"
      aria-pressed={interactive ? selected : undefined}
      aria-expanded={interactive ? selected : undefined}
      onClick={onSelect}
      disabled={!interactive}
      className={cn(
        "block w-full border p-3 text-left transition-colors",
        interactive ? "cursor-pointer" : "cursor-default",
        selected
          ? "border-ink bg-surface shadow-(--shadow-selected)"
          : "border-hairline bg-transparent",
        interactive && !selected && "hover:bg-surface",
      )}
      style={{
        borderLeftColor: railColor(finding),
        borderLeftWidth: selected ? 5 : 3,
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={cn(
            "inline-flex size-5.5 shrink-0 items-center justify-center font-cond text-[13px] font-semibold tabular-nums",
            selected ? "bg-ink text-surface" : "bg-transparent",
          )}
          style={
            selected
              ? undefined
              : { border: `1px solid ${railColor(finding)}`, color: railColor(finding) }
          }
        >
          {finding.n}
        </span>
        <span
          className="font-cond text-[11px] tracking-widest uppercase"
          style={{
            color: finding.severity ? severityColorVar[finding.severity] : "var(--color-steel)",
          }}
        >
          {finding.passLabel && finding.kind !== "best-practice" ? finding.passLabel : label}
        </span>
        <span className="ml-auto">
          <TopTag f={finding} t={t} />
        </span>
      </div>

      <h3 className="mt-2 text-[15.5px] leading-snug font-semibold text-ink">{finding.title}</h3>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] leading-normal text-muted">
        <span>
          {finding.elements} element{finding.elements === 1 ? "" : "s"}
        </span>
        <span aria-hidden>·</span>
        <span className="font-mono text-[11.5px]">{finding.ruleId}</span>
        <VerdictCue kind={finding.verdict.kind} t={t} />
      </p>

      {noMarker && (
        <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted">
          <span aria-hidden className="inline-block h-3 w-3 border border-dashed border-border" />
          {t("results.noMarkerOffScreenshot")}
        </p>
      )}
    </button>
  );
}
