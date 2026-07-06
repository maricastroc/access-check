"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe, faSitemap } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui";

type Mode = "page" | "site";

const MODES = [
  { key: "page", label: "Single page", icon: faGlobe },
  { key: "site", label: "Entire site", icon: faSitemap },
] as const;

export function UrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("page");

  function go(target: string, m: Mode) {
    const value = target.trim();
    if (m === "site") {
      router.push(value ? `/site?url=${encodeURIComponent(value)}` : "/site");
    } else {
      router.push(value ? `/results?url=${encodeURIComponent(value)}` : "/results");
    }
  }

  const isSite = mode === "site";

  return (
    <>
      <div
        role="tablist"
        aria-label="Scan scope"
        className="mt-9 inline-flex items-center gap-1 rounded-full border border-line bg-canvas p-1"
      >
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(m.key)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active ? "bg-card text-brand-700 shadow-soft" : "text-muted hover:text-ink"
              }`}
            >
              <FontAwesomeIcon icon={m.icon} className="text-[0.9em]" />
              {m.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(url, mode);
        }}
        className="url-field mt-4 flex max-w-xl flex-col items-stretch gap-2 rounded-field border border-line bg-card p-2 shadow-card sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 items-center gap-3 px-3">
          <FontAwesomeIcon
            icon={isSite ? faSitemap : faGlobe}
            className="shrink-0 text-base text-muted"
          />
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
          {isSite ? "Scan entire site" : "Analyze accessibility"}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm">
        <p className="text-muted">
          {isSite
            ? "Crawls linked pages on the same domain and scores the whole site."
            : "Runs a full WCAG 2.1 audit on a single page."}
        </p>

        <span className="hidden h-4 w-px bg-line sm:block" />

        <span className="flex items-center gap-3">
          <span className="text-muted">Try an example:</span>
          <button
            type="button"
            onClick={() => go("vercel.com", mode)}
            className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 font-mono text-brand-700 transition-colors hover:bg-brand-100"
          >
            vercel.com
          </button>
        </span>
      </div>
    </>
  );
}
