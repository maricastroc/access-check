"use client";

import { useState, type ReactNode } from "react";
import type { FindingView, QueueGroup } from "@/lib/report/findings";
import { categoryOf } from "@/lib/report/guidance";
import { severityLabel } from "@/lib/report/severity";
import { threadEnd, contrastReading, type ThreadEnd } from "@/lib/report/chain";
import { occurrencesOf } from "@/lib/report/occurrences";
import type { MessageKey, Translate } from "@/lib/i18n/t";
import { cn } from "@/lib/cn";
import { NodeGlyph, Tag, sevOf } from "./notation";

export type FindingGroups = { group: QueueGroup; findings: FindingView[] }[];

const GROUP_TITLE: Record<QueueGroup, MessageKey> = {
  fix: "panel.group.fix",
  check: "panel.group.check",
  recommend: "panel.group.recommend",
};

const STATUS: Partial<Record<ThreadEnd, MessageKey>> = {
  tested: "chain.status.tested",
  failed: "chain.status.failed",
  person: "chain.status.person",
  recheck: "chain.status.recheck",
};

export function gapOf(f: FindingView, t: Translate): string {
  if (f.kind === "manual-review") return t("chain.gap.unmeasured");
  const category = categoryOf(f.ruleId, f.kind);
  if (category === "contrast") {
    const reading = contrastReading(f, occurrencesOf(f)[0] ?? null);
    if (reading) {
      return t("results.measuredNeeds", {
        measured: reading.measured.toFixed(2),
        required: reading.required,
      });
    }
  }
  if (category === "name") return t("chain.gap.name");
  if (category === "alt") return t("chain.gap.alt");
  if (f.ruleId === "focus-not-visible") return t("chain.gap.ring");
  return t("unit.element", { count: f.elements });
}

export function labelOf(f: FindingView, t: Translate): string {
  if (f.kind === "manual-review" || f.kind === "best-practice") {
    return f.passLabel ?? t("finding.kind.bestPractice");
  }
  return [f.severity ? severityLabel(f.severity, t) : null, f.passLabel]
    .filter(Boolean)
    .join(" · ");
}

function statusKey(f: FindingView): MessageKey | null {
  const end = threadEnd(f);
  if (!end) return null;
  if (end === "person" && f.kind !== "manual-review") return "chain.status.fixPerson";
  return STATUS[end] ?? null;
}

function Status({ f, t }: { f: FindingView; t: Translate }) {
  const end = threadEnd(f);
  const key = statusKey(f);
  if (!end || !key) return null;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
      <NodeGlyph kind="end" sev={sevOf(f)} end={end} />
      {t(key)}
    </span>
  );
}

export function FindingList({
  groups,
  selectedId,
  onToggle,
  renderOpen,
  t,
  hoveredId = null,
  onHover,
  aside,
  compact = false,
  rowAttrs,
  empty,
}: {
  groups: FindingGroups;
  selectedId: string | null;
  onToggle: (id: string) => void;
  renderOpen: (f: FindingView, siblings: FindingView[], i: number) => ReactNode;
  t: Translate;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  aside?: (f: FindingView) => ReactNode;
  compact?: boolean;
  rowAttrs?: Record<string, string>;
  empty: string;
}) {
  const holding = groups.find((g) => g.findings.some((f) => f.id === selectedId))?.group;
  const [opened, setOpened] = useState<ReadonlySet<QueueGroup>>(() => new Set(["fix"]));
  const [openedFor, setOpenedFor] = useState(holding);
  if (openedFor !== holding) {
    setOpenedFor(holding);
    if (holding && !opened.has(holding)) setOpened(new Set([...opened, holding]));
  }

  const pad = compact ? "px-3" : "px-6";

  const row = (f: FindingView, siblings: FindingView[], i: number) => {
    const open = f.id === selectedId;
    const hover = {
      onMouseEnter: () => onHover?.(f.id),
      onMouseLeave: () => onHover?.(null),
      onFocus: () => onHover?.(f.id),
      onBlur: () => onHover?.(null),
    };
    return (
      <li
        key={f.id}
        id={`finding-${f.id}`}
        data-finding={f.n}
        data-kind={f.kind}
        className={cn(
          "scroll-mt-24",
          open && "bg-surface",
          !open && hoveredId === f.id && "bg-surface/70",
        )}
        {...rowAttrs}
      >
        <h3 className="m-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? `investigation-${f.id}` : undefined}
            onClick={() => onToggle(f.id)}
            {...hover}
            className={cn(
              "ac-focus-inset grid w-full cursor-pointer items-start gap-x-3.5 text-left tracking-[-0.01em]",
              "grid-cols-[auto_minmax(0,1fr)]",
              pad,
              compact ? (open ? "pt-3 pb-3" : "py-4") : open ? "pt-3.5 pb-3" : "py-4",
              !open && "hover:bg-surface/70",
            )}
          >
            <span className={cn("relative", open ? "self-stretch" : "pt-px")}>
              <Tag n={f.n} sev={sevOf(f)} size={open ? 30 : 24} />
              {open && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-[34px] -bottom-3 left-[14px] border-l-2 border-ink",
                    (f.kind === "manual-review" || f.evidence === "heuristic") && "border-dashed",
                  )}
                />
              )}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block leading-snug break-words text-ink",
                  open
                    ? compact
                      ? "text-[17px] font-bold"
                      : "text-[19px] font-bold tracking-[-0.01em]"
                    : "text-[15px] font-semibold",
                )}
              >
                {f.title}
              </span>
              {open ? (
                <>
                  <span className="mt-1 block text-[13.5px] font-semibold text-ink-2">
                    {labelOf(f, t)}
                  </span>
                  <span
                    className={cn(
                      "mt-1.5 block leading-normal font-normal break-words text-ink-2",
                      compact ? "text-[14px]" : "text-[15px]",
                    )}
                  >
                    {f.impact}
                  </span>
                </>
              ) : (
                <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13.5px] font-normal text-muted">
                  <span className="font-semibold text-ink-2">{labelOf(f, t)}</span>
                  <span aria-hidden>·</span>
                  <span>{gapOf(f, t)}</span>
                  {f.elements > 1 &&
                    f.ruleId !== "focus-not-visible" &&
                    categoryOf(f.ruleId, f.kind) === "contrast" && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{t("unit.element", { count: f.elements })}</span>
                      </>
                    )}
                  {aside?.(f)}
                  {compact && statusKey(f) && (
                    <span className="ml-auto pl-3">
                      <Status f={f} t={t} />
                    </span>
                  )}
                </span>
              )}
            </span>
            {!open && !compact && (
              <span className="col-start-2 pt-1.75">
                <Status f={f} t={t} />
              </span>
            )}
          </button>
        </h3>
        {open && renderOpen(f, siblings, i)}
      </li>
    );
  };

  return (
    <div className="flex flex-col pb-6">
      {groups.map(({ group, findings }) => {
        const heading = (
          <span className="text-[14px] font-semibold text-ink-2">
            {t(GROUP_TITLE[group])}{" "}
            <span className="ml-1 font-normal text-muted tabular-nums">{findings.length}</span>
          </span>
        );
        const list = <ul>{findings.map((f, i) => row(f, findings, i))}</ul>;

        if (group === "fix") {
          return (
            <section
              key={group}
              aria-labelledby={`group-${group}`}
              data-group={group}
              className="mt-2"
            >
              <h2 id={`group-${group}`} className={cn("py-2", pad)}>
                {heading}
              </h2>
              {findings.length === 0 ? (
                <p className={cn("pb-3 text-[14.5px] leading-normal text-ink-2", pad)}>{empty}</p>
              ) : (
                list
              )}
            </section>
          );
        }

        if (findings.length === 0) return null;
        return (
          <details
            key={group}
            data-group={group}
            className="mt-5"
            open={opened.has(group)}
            onToggle={(e) => {
              const now = e.currentTarget.open;
              if (now === opened.has(group)) return;
              const next = new Set(opened);
              if (now) next.add(group);
              else next.delete(group);
              setOpened(next);
            }}
          >
            <summary className={cn("flex cursor-pointer items-center gap-1.5 py-2", pad)}>
              <span aria-hidden className="ac-chev text-ink-2" />
              <h2 id={`group-${group}`} className="inline">
                {heading}
              </h2>
            </summary>
            {list}
          </details>
        );
      })}
    </div>
  );
}
