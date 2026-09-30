"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { ScanErrorCode, ScanPhase } from "@/lib/scan/types";
import { Button, ProgressCard, ScanStages, useElapsed } from "@/components/ui";
import { UrlField } from "@/components/home/url-form";
import { CHROME_WEB_STORE_URL } from "@/components/home/content";
import { TYPICAL_SCAN_MS } from "@/lib/scan/policy";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/t";

const PHASE_KEY: Record<ScanPhase, MessageKey> = {
  preparing: "phase.preparing",
  loading: "phase.loading",
  auditing: "phase.auditing",
  processing: "phase.processing",
  finalizing: "phase.finalizing",
};

export function ScanningState({ url, phase }: { url: string; phase: ScanPhase }) {
  const t = useT();
  const elapsed = useElapsed();

  return (
    <div className="px-4 py-16">
      <ProgressCard
        target={url}
        elapsedMs={elapsed}
        budgetMs={TYPICAL_SCAN_MS}
        note={t("results.stepsNote")}
        status={t("results.scanningStatus", { url, phase: t(PHASE_KEY[phase]) })}
      >
        <ScanStages t={t} phase={phase} />
      </ProgressCard>
    </div>
  );
}

export function ErrorState({
  url,
  message,
  hint,
  code = null,
  onChange,
  onRetry,
}: {
  url: string;
  message: string;
  hint?: string;
  code?: ScanErrorCode | null;
  onChange: (v: string) => void;
  onRetry: () => void;
}) {
  const t = useT();
  return (
    <div className="mx-auto w-full max-w-140 px-4 py-16">
      <div role="alert" className="border border-critical bg-surface p-6">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex size-6 shrink-0 items-center justify-center bg-critical text-surface"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </span>
          <h2 className="text-[16px] font-semibold text-ink">{t("results.couldNotOpen")}</h2>
        </div>
        <p className="mt-3 text-[14px] leading-normal text-body">{message}</p>
        {hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRetry();
          }}
          className="mt-5 flex flex-col gap-3"
        >
          <UrlField value={url} onChange={onChange} onSubmit={onRetry} />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" size="md">
              {t("results.tryAnotherUrl")}
            </Button>
            {code === "site-blocked" ? (
              <Button href={CHROME_WEB_STORE_URL} variant="secondary" size="md">
                {t("results.getExtension")}
              </Button>
            ) : (
              <Button href="/" variant="tertiary">
                {t("results.seeWhatWeAudit")}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
