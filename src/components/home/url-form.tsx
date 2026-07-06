"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe, faSitemap } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui";

export function UrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  function analyze(target?: string) {
    const value = (target ?? url).trim();
    router.push(value ? `/results?url=${encodeURIComponent(value)}` : "/results");
  }

  function scanSite() {
    const value = url.trim();
    router.push(value ? `/site?url=${encodeURIComponent(value)}` : "/site");
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          analyze();
        }}
        className="mt-9 flex max-w-xl flex-col items-stretch gap-2 rounded-field border border-line bg-card p-2 shadow-card sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 items-center gap-3 px-3">
          <FontAwesomeIcon icon={faGlobe} className="shrink-0 text-base text-muted" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourwebsite.com"
            aria-label="Website URL"
            className="w-full bg-transparent py-2.5 text-base text-ink placeholder:text-muted/70 focus:outline-none"
          />
        </div>
        <Button type="submit" className="w-full shrink-0 sm:w-auto">
          Analyze accessibility
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm">
        <button
          type="button"
          onClick={scanSite}
          className="inline-flex cursor-pointer items-center gap-2 font-semibold text-brand-700 transition-colors hover:text-brand-800"
        >
          <FontAwesomeIcon icon={faSitemap} className="text-[0.9em]" />
          Scan the entire site
          <span aria-hidden>→</span>
        </button>

        <span className="hidden h-4 w-px bg-line sm:block" />

        <span className="flex items-center gap-3">
          <span className="text-muted">Try an example:</span>
          <button
            type="button"
            onClick={() => analyze("vercel.com")}
            className="rounded-md bg-brand-50 px-2 py-1 font-mono text-brand-700 transition-colors hover:bg-brand-100"
          >
            vercel.com
          </button>
        </span>
      </div>
    </>
  );
}
