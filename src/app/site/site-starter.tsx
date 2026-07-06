"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui";
import { CrawlShell } from "./chrome";
import { crawlHost } from "./shared";

export function SiteStarter({ initialUrl }: { initialUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
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
        if (!res.ok) throw new Error(json.error || "Could not start the site scan.");
        router.replace(`/site/${json.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start the site scan.");
      }
    })();
  }, [initialUrl, router]);

  return (
    <CrawlShell>
      {error ? (
        <div
          role="alert"
          className="mt-10 flex flex-col items-center gap-5 rounded-2xl border border-line bg-card px-6 py-14 text-center shadow-soft"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-[#fdecec] text-critical">
            <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden className="text-xl" />
          </span>
          <div className="max-w-md">
            <p className="text-lg font-semibold">Couldn’t start the site audit</p>
            <p className="mt-1.5 text-sm text-muted">{error}</p>
          </div>
          <Button href="/">Back to home</Button>
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          className="mt-10 flex flex-col items-center gap-5 px-6 py-14 text-center"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <FontAwesomeIcon icon={faSpinner} aria-hidden className="animate-spin text-xl" />
          </span>
          <div>
            <p className="text-lg font-semibold">Discovering pages…</p>
            <p className="mt-1.5 text-sm text-muted">
              Reading the sitemap and links on{" "}
              <span className="font-medium text-ink">{crawlHost(initialUrl) || "the site"}</span> to
              build the crawl.
            </p>
          </div>
        </div>
      )}
    </CrawlShell>
  );
}
