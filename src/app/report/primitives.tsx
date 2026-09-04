import type { Severity } from "@/lib/scan/types";
import { BrandMark } from "@/components/ui";
import { sevHex, sevLabel } from "./shared";

export function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-cond text-[11px] font-medium tracking-[0.12em] text-steel uppercase">
      {children}
    </span>
  );
}

export function SectionKickerMuted({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-cond text-[11px] font-medium tracking-[0.12em] text-muted uppercase">
      {children}
    </span>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode; tone?: "brand" }) {
  return (
    <div className="font-cond text-[9px] font-medium tracking-[0.12em] text-muted uppercase">
      {children}
    </div>
  );
}

export function PageShell({
  children,
  page,
  host,
}: {
  children: React.ReactNode;
  page: number;
  host: string;
}) {
  return (
    <section className="ac-page flex min-h-264 w-204 flex-col border border-border bg-surface px-[0.62in] py-12">
      <div className="flex flex-1 flex-col">{children}</div>
      <PageFooter page={page} host={host} />
    </section>
  );
}

function PageFooter({ page, host }: { page: number; host: string }) {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3 text-[10px] text-muted">
      <span className="flex items-center gap-1.5">
        <BrandMark size={13} />
        <span>Internal score · not a conformance statement</span>
      </span>
      <span className="truncate px-2 font-mono text-[9.5px]">{host}</span>
      <span>WCAG A &amp; AA · Page {page} / 3</span>
    </div>
  );
}

export function MiniHeader({ host }: { host: string }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline pb-3">
      <div className="flex items-center gap-2">
        <BrandMark size={18} />
        <span className="text-[14px] font-semibold text-ink">AccessCheck</span>
      </div>
      <span className="truncate pl-3 font-mono text-[10.5px] text-muted">
        Accessibility report · {host}
      </span>
    </div>
  );
}

export function LegendChip({ sev, count }: { sev: Severity; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-ink">
      <span aria-hidden className="size-2.5" style={{ background: sevHex[sev] }} />
      {sevLabel[sev]} <b className="font-medium text-muted tabular-nums">{count}</b>
    </span>
  );
}

export function GroupHeading({ sev, count }: { sev: Severity; count: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="size-2.5" style={{ background: sevHex[sev] }} />
      <span className="text-[13px] font-semibold text-ink">{sevLabel[sev]}</span>
      <span
        className="px-2 py-0.5 font-cond text-[10px] font-medium tracking-[0.08em] uppercase"
        style={{ color: sevHex[sev] }}
      >
        {count} finding{count > 1 ? "s" : ""}
      </span>
      <span aria-hidden className="h-px flex-1 bg-hairline" />
    </div>
  );
}
