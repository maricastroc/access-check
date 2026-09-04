"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** The URL input control: mono https:// prefix, straight corners, 1.5px ink border. */
export function UrlField({
  value,
  onChange,
  onSubmit,
  size = "md",
  placeholder = "example.com",
  error,
  trailing,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  size?: "sm" | "md" | "lg";
  placeholder?: string;
  error?: string;
  trailing?: React.ReactNode;
  autoFocus?: boolean;
}) {
  const height = size === "lg" ? "h-[66px]" : size === "sm" ? "h-[52px]" : "h-[56px]";
  return (
    <div>
      <div
        className={cn(
          "flex w-full items-center gap-3 border-[1.5px] bg-surface px-3.5",
          height,
          error ? "border-critical" : "border-ink",
        )}
      >
        <span className="shrink-0 font-mono text-[14.5px] text-muted">https://</span>
        <span aria-hidden className="h-6 w-px bg-hairline" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSubmit) {
              e.preventDefault();
              onSubmit();
            }
          }}
          aria-label="Website address to audit"
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="min-w-0 flex-1 bg-transparent font-mono text-[16px] text-ink placeholder:text-muted focus:outline-none"
        />
        {trailing}
      </div>
      {error && <p className="mt-1.5 text-[12.5px] text-critical">{error}</p>}
    </div>
  );
}

type Scope = "page" | "site";

/** Landing hero form: URL + scope (single page / entire site) + audit action. */
export function UrlForm({ accent = false, examples }: { accent?: boolean; examples?: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<Scope>("page");

  const go = (target: string, s: Scope) => {
    const v = target.trim();
    const base = s === "site" ? "/site" : "/results";
    router.push(v ? `${base}?url=${encodeURIComponent(v)}` : base);
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="min-w-0 flex-1">
          <UrlField
            value={value}
            onChange={setValue}
            onSubmit={() => go(value, scope)}
            size="lg"
            trailing={
              <div className="hidden items-stretch border border-border sm:flex" role="tablist" aria-label="What to audit">
                {(["page", "site"] as Scope[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={scope === s}
                    onClick={() => setScope(s)}
                    className={cn(
                      "px-3 text-[13px] font-medium",
                      scope === s ? "bg-ink text-surface" : "bg-surface text-muted hover:bg-band",
                      s === "site" && "border-l border-border",
                    )}
                  >
                    {s === "page" ? "Page" : "Site"}
                  </button>
                ))}
              </div>
            }
          />
        </div>
        <button
          type="button"
          onClick={() => go(value, scope)}
          className={cn(
            "inline-flex h-[66px] shrink-0 items-center justify-center gap-3 px-8 text-[16.5px] font-semibold text-surface transition-colors",
            accent ? "bg-serious hover:brightness-110" : "bg-ink hover:bg-ink-2",
          )}
        >
          {scope === "site" ? "Audit site" : "Audit page"}
          <span aria-hidden className="h-px w-5 bg-surface" />
        </button>
      </div>
      <p className={cn("mt-3 text-[13.5px]", accent ? "text-disabled" : "text-muted")}>
        No account, no extension, no change to the audited site
        <span aria-hidden className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border" />
        Export as PDF or Markdown
        <span aria-hidden className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border" />
        About 10 to 25 seconds per page
      </p>
      {examples && examples.length > 0 && (
        <p className={cn("mt-2 text-[13px]", accent ? "text-band" : "text-muted")}>
          Quick examples:{" "}
          {examples.map((ex, i) => (
            <span key={ex}>
              {i > 0 && <span aria-hidden className="mx-1.5 text-border">·</span>}
              <button
                type="button"
                onClick={() => setValue(ex)}
                className={cn(
                  "cursor-pointer font-mono text-[12.5px] hover:underline",
                  accent ? "text-band" : "text-steel",
                )}
              >
                {ex}
              </button>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
