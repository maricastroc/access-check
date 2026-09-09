"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Button, Ruler, StageList } from "@/components/ui";
import { CrawlShell } from "./chrome";
import { crawlHost } from "./shared";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/t";

const BUDGET_MS = 20_000;

const DISCOVERY_STAGE_KEYS: MessageKey[] = [
  "site.readingSitemap",
  "site.followingLinks",
  "site.choosingPages",
];

function stageFor(elapsedMs: number): number {
  if (elapsedMs < 6_000) return 0;
  if (elapsedMs < 13_000) return 1;
  return 2;
}

export function SiteStarter({ initialUrl }: { initialUrl: string }) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!initialUrl.trim()) {
      router.replace("/");
      return;
    }

    void (async () => {
      try {
        const res = await fetch("/api/site-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: initialUrl }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || t("site.startFailed"));
        router.replace(`/site/${json.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("site.startFailed"));
      }
    })();
  }, [initialUrl, router, t]);

  useEffect(() => {
    if (error) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - started), 100);
    return () => clearInterval(id);
  }, [error]);

  const host = crawlHost(initialUrl) || t("site.theSite");

  if (error) {
    return (
      <CrawlShell t={t}>
        <div
          role="alert"
          className="mx-auto w-full max-w-140 border border-critical bg-surface p-6"
        >
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="inline-flex size-6 shrink-0 items-center justify-center bg-critical text-surface"
            >
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </span>
            <h1 className="text-[16px] font-semibold text-ink">{t("site.startFailedTitle")}</h1>
          </div>
          <p className="mt-3 text-[14px] leading-normal text-body">{error}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button href="/" variant="primary" size="md">
              {t("site.tryAnotherAddress")}
            </Button>
            <Button href={`/results?url=${encodeURIComponent(initialUrl)}`} variant="tertiary">
              {t("site.auditJustThisPage")}
            </Button>
          </div>
        </div>
      </CrawlShell>
    );
  }

  return (
    <CrawlShell t={t}>
      <DiscoveryProgress host={host} elapsed={elapsed} />
    </CrawlShell>
  );
}

export function DiscoveryProgress({ host, elapsed }: { host: string; elapsed: number }) {
  const t = useT();
  const secs = (elapsed / 1000).toFixed(1);
  const budget = Math.round(BUDGET_MS / 1000);

  return (
    <div className="mx-auto w-full max-w-160">
      <div className="border border-border bg-surface p-6">
        <div className="flex items-baseline gap-2">
          <span className="font-cond text-[28px] leading-none text-ink tabular-nums">{secs}s</span>
          <span className="text-[13px] text-muted">{t("site.upTo", { seconds: budget })}</span>
          <span className="ml-auto truncate font-mono text-[12.5px] text-muted">{host}</span>
        </div>
        <div className="mt-3">
          <Ruler
            t={t}
            variant="progress"
            elapsedMs={elapsed}
            budgetMs={BUDGET_MS}
            label={t("site.findingPages", { host, elapsed: secs, budget })}
          />
        </div>
        <div className="mt-4">
          <StageList
            stages={DISCOVERY_STAGE_KEYS.map((key) => t(key))}
            current={stageFor(elapsed)}
          />
        </div>
        <p className="mt-3 text-[12.5px] text-muted">{t("site.listNote")}</p>
        <p className="sr-only" role="status" aria-live="polite">
          Finding pages to audit on {host}.
        </p>
      </div>
    </div>
  );
}
