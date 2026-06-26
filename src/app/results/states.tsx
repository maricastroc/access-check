"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe, faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

export function ScanningState({ url }: { url: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl" />
      </span>
      <div>
        <p className="text-lg font-semibold">Auditing the page…</p>
        <p className="mt-1.5 text-sm text-muted">
          Rendering <span className="font-medium text-ink">{url}</span>, injecting axe-core and
          checking 50+ WCAG rules.
        </p>
      </div>
      <div className="mt-1 flex items-center gap-2 font-mono text-xs text-faint">
        <span className="size-1.5 animate-pulse rounded-full bg-brand-400" />
        usually 3–15 seconds
      </div>
    </div>
  );
}

export function ErrorState({
  url,
  message,
  onChange,
  onRetry,
}: {
  url: string;
  message: string;
  onChange: (v: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-[#fdecec] text-critical">
        <FontAwesomeIcon icon={faTriangleExclamation} className="text-xl" />
      </span>
      <div className="max-w-md">
        <p className="text-lg font-semibold">Couldn’t scan that page</p>
        <p className="mt-1.5 text-sm text-muted">{message}</p>
        <p className="mt-1 text-xs text-faint">
          Some sites block bots or sit behind a login — try another URL.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onRetry();
        }}
        className="flex w-full max-w-md items-center gap-2 rounded-field border border-line bg-card p-2 shadow-soft"
      >
        <FontAwesomeIcon icon={faGlobe} className="ml-2 text-sm text-muted" />
        <input
          value={url}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-ink focus:outline-none"
          placeholder="example.com"
        />
        <button
          type="submit"
          className="rounded-[9px] bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Try again
        </button>
      </form>
    </div>
  );
}
