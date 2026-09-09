"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { SectionKicker } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";

export function UrlField({
  value,
  onChange,
  onSubmit,
  size = "md",
  placeholder = "example.com",
  error,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  size?: "sm" | "md" | "lg";
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
}) {
  const t = useT();
  const height = size === "lg" ? "h-[66px]" : size === "sm" ? "h-[52px]" : "h-[56px]";
  const errorId = useId();

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
          aria-label={t("form.addressLabel")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="min-w-0 flex-1 bg-transparent font-mono text-[16px] text-ink placeholder:text-muted focus:outline-none"
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[12.5px] text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

type Scope = "page" | "site";

export function UrlForm({ accent = false, examples }: { accent?: boolean; examples?: string[] }) {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<Scope>("page");
  const [error, setError] = useState("");

  const go = (target: string, s: Scope) => {
    const v = target.trim();
    if (!v) {
      setError(t("form.addressHint"));
      return;
    }
    router.push(`${s === "site" ? "/site" : "/results"}?url=${encodeURIComponent(v)}`);
  };

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <SectionKicker tone={accent ? "band" : "muted"}>{t("form.whatToAudit")}</SectionKicker>
        <div
          className={cn("flex items-stretch border", accent ? "border-disabled" : "border-border")}
          role="group"
          aria-label={t("form.whatToAudit")}
        >
          {(["page", "site"] as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scope === s}
              onClick={() => setScope(s)}
              className={cn(
                "h-7 cursor-pointer px-3 text-[12.5px] font-medium",
                scope === s
                  ? accent
                    ? "bg-surface text-ink"
                    : "bg-ink text-surface"
                  : accent
                    ? "text-band hover:bg-ink-2"
                    : "bg-surface text-muted hover:bg-band",
                s === "site" && (accent ? "border-l border-disabled" : "border-l border-border"),
              )}
            >
              {s === "page" ? t("form.scopePage") : t("form.scopeSite")}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="min-w-0 flex-1">
          <UrlField
            value={value}
            onChange={(v) => {
              setValue(v);
              setError("");
            }}
            onSubmit={() => go(value, scope)}
            error={error}
            size="lg"
          />
        </div>
        <button
          type="button"
          onClick={() => go(value, scope)}
          className={cn(
            "inline-flex h-16.5 shrink-0 cursor-pointer items-center justify-center gap-3 px-8 text-[16.5px] font-semibold text-surface transition-colors",
            accent ? "bg-serious hover:brightness-110" : "bg-ink hover:bg-ink-2",
          )}
        >
          {scope === "site" ? t("home.auditSite") : t("home.auditPage")}
          <span aria-hidden className="h-px w-5 bg-surface" />
        </button>
      </div>
      <p className={cn("mt-3 text-[13.5px]", accent ? "text-disabled" : "text-muted")}>
        {t("home.form.noAccount")}
        <span aria-hidden className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border" />
        {t("home.form.exportNote")}
        <span aria-hidden className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border" />
        {t("home.timing")}
      </p>
      {examples && examples.length > 0 && (
        <p className={cn("mt-2 text-[13px]", accent ? "text-band" : "text-muted")}>
          {t("home.quickExamples")}{" "}
          {examples.map((ex, i) => (
            <span key={ex}>
              {i > 0 && (
                <span aria-hidden className="mx-1.5 text-border">
                  ·
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setValue(ex);
                  setError("");
                }}
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
