"use client";

import { useEffect, useState } from "react";
import type { FindingView } from "@/lib/report/findings";
import type { Occurrence } from "@/lib/report/occurrences";
import type { Translate } from "@/lib/i18n/t";

export function CopyButton({ label, value, t }: { label: string; value: string; t: Translate }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() =>
        navigator.clipboard.writeText(value).then(
          () => setState("done"),
          () => setState("failed"),
        )
      }
      className="min-h-8 cursor-pointer border border-border bg-surface px-2.5 text-[13px] font-semibold text-ink hover:border-ink"
    >
      <span aria-live="polite">
        {state === "done" ? t("panel.copied") : state === "failed" ? t("panel.copyFailed") : label}
      </span>
    </button>
  );
}

export function ElementDetails({
  finding,
  occ,
  t,
}: {
  finding: FindingView;
  occ: Occurrence | null;
  t: Translate;
}) {
  const criterion = [finding.criterionSc, finding.criterionName].filter(Boolean).join(" ");
  const truncated = occ?.html?.includes("…") ?? false;

  return (
    <details className="mt-5 pl-11">
      <summary className="flex w-fit cursor-pointer items-center gap-1.5">
        <span aria-hidden className="ac-chev text-ink-2" />
        <h4 className="text-[13.5px] font-semibold text-ink-2">{t("panel.details")}</h4>
      </summary>

      <dl className="mt-3 space-y-2.5 text-[13px] leading-normal">
        {occ && (
          <div>
            <dt className="text-muted">{t("panel.selector")}</dt>
            <dd className="mt-0.5 font-mono break-all text-steel">{occ.selector}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted">{t("detail.rule")}</dt>
          <dd className="mt-0.5 break-words text-ink-2">
            <code className="font-mono text-steel">{finding.ruleId}</code>
            {criterion && ` · ${criterion}`}
          </dd>
        </div>
        {occ?.html && (
          <div>
            <dt className="text-muted">{t("panel.html")}</dt>
            <dd className="mt-1">
              <pre className="max-h-40 overflow-auto bg-code p-2 font-mono text-[12px] break-all whitespace-pre-wrap text-ink">
                {occ.html}
              </pre>
              {truncated && (
                <p className="mt-1.5 text-[12.5px] text-muted">{t("panel.abbreviated")}</p>
              )}
            </dd>
          </div>
        )}
        {occ?.measured && (
          <div>
            <dt className="text-muted">{t("panel.measured")}</dt>
            <dd className="mt-0.5 break-words text-ink-2">{occ.measured}</dd>
          </div>
        )}
        {occ?.rect && (
          <div>
            <dt className="text-muted">{t("panel.position")}</dt>
            <dd className="mt-0.5 text-ink-2 tabular-nums">
              {t("panel.positionValue", {
                w: Math.round(occ.rect.w),
                h: Math.round(occ.rect.h),
                x: Math.round(occ.rect.x),
                y: Math.round(occ.rect.y),
              })}
              {occ.onScreen ? "" : t("panel.offViewport")}
            </dd>
          </div>
        )}
      </dl>

      {occ && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <CopyButton label={t("panel.copySelector")} value={occ.selector} t={t} />
          {occ.html && <CopyButton label={t("panel.copyHtml")} value={occ.html} t={t} />}
        </div>
      )}
    </details>
  );
}
