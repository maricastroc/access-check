"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { FindingView, QueueGroup } from "@/lib/report/findings";
import type { MessageKey, Translate } from "@/lib/i18n/t";
import { SectionKicker } from "@/components/ui";

export type QueueGroups = { group: QueueGroup; findings: FindingView[] }[];

const GROUP_TITLE: Record<QueueGroup, MessageKey> = {
  fix: "panel.group.fix",
  check: "panel.group.check",
  recommend: "panel.group.recommend",
};

export function WorkQueue({
  groups,
  selectedId,
  renderRow,
  t,
}: {
  groups: QueueGroups;
  selectedId: string | null;
  renderRow: (finding: FindingView) => ReactNode;
  t: Translate;
}) {
  const [opened, setOpened] = useState<ReadonlySet<QueueGroup>>(() => new Set(["fix"]));
  const holding = groups.find((g) => g.findings.some((f) => f.id === selectedId))?.group;
  const [openedFor, setOpenedFor] = useState(holding);
  if (openedFor !== holding) {
    setOpenedFor(holding);
    if (holding && !opened.has(holding)) setOpened(new Set([...opened, holding]));
  }

  const toggle = (group: QueueGroup, open: boolean) => {
    if (open === opened.has(group)) return;
    const next = new Set(opened);
    if (open) next.add(group);
    else next.delete(group);
    setOpened(next);
  };

  return (
    <div className="flex flex-col">
      {groups.map(({ group, findings }) => {
        const heading = (
          <SectionKicker as="h2" id={`group-${group}`} tone="ink" className="inline">
            {t(GROUP_TITLE[group])} · {findings.length}
          </SectionKicker>
        );
        const rows = <div className="flex flex-col gap-2 pt-1 pb-3">{findings.map(renderRow)}</div>;

        if (group === "fix") {
          return (
            <section key={group} aria-labelledby={`group-${group}`} data-group={group}>
              <div className="py-2.5">{heading}</div>
              {findings.length === 0 ? (
                <p className="pb-3 text-[13.5px] leading-normal text-body">
                  {t("results.nothingToFix")}
                </p>
              ) : (
                rows
              )}
            </section>
          );
        }

        if (findings.length === 0) return null;
        return (
          <details
            key={group}
            data-group={group}
            className="border-t border-hairline"
            open={opened.has(group)}
            onToggle={(e) => toggle(group, e.currentTarget.open)}
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 py-2.5">
              <span aria-hidden className="ac-chev font-cond text-muted transition-transform">
                ▸
              </span>
              {heading}
            </summary>
            {rows}
          </details>
        );
      })}
    </div>
  );
}
