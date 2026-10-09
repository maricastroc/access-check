import type { Severity } from "@/lib/scan/types";
import { BrandMark } from "@/components/ui";
import { sevColor, sevLabelKey } from "./shared";
import type { Translate } from "@/lib/i18n/t";

export function SectionKicker({ children }: { children: React.ReactNode }) {
  return <span className="font-cond text-[12.5px] font-semibold text-steel">{children}</span>;
}

export function SectionKickerMuted({ children }: { children: React.ReactNode }) {
  return <span className="font-cond text-[12.5px] font-semibold text-muted">{children}</span>;
}

export function FieldLabel({ children }: { children: React.ReactNode; tone?: "brand" }) {
  return <div className="font-cond text-[10.5px] font-semibold text-muted">{children}</div>;
}

export function PageShell({
  children,
  page,
  host,
  t,
}: {
  children: React.ReactNode;
  page: number;
  host: string;
  t: Translate;
}) {
  return (
    <section className="ac-page flex min-h-264 w-204 flex-col border border-border bg-surface px-[0.62in] py-12">
      <div className="flex flex-1 flex-col">{children}</div>
      <PageFooter page={page} host={host} t={t} />
    </section>
  );
}

function PageFooter({ page, host, t }: { page: number; host: string; t: Translate }) {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3 text-[10px] text-muted">
      <span className="flex items-center gap-1.5">
        <BrandMark size={13} />
        <span>{t("report.internalScoreFooter")}</span>
      </span>
      <span className="truncate px-2 font-mono text-[9.5px]">{host}</span>
      <span>{t("report.pageOf", { page })}</span>
    </div>
  );
}

export function MiniHeader({ host, t }: { host: string; t: Translate }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline pb-3">
      <div className="flex items-center gap-2">
        <BrandMark size={18} />
        <span className="text-[14px] font-semibold text-ink">AccessCheck</span>
      </div>
      <span className="truncate pl-3 font-mono text-[10.5px] text-muted">
        {t("report.headerTitle", { host })}
      </span>
    </div>
  );
}

export function LegendChip({ sev, count, t }: { sev: Severity; count: number; t: Translate }) {
  return (
    <span className="inline-flex items-center gap-1.5 py-1 text-[11px] font-medium text-ink">
      <span aria-hidden className="size-2.5" style={{ background: sevColor[sev] }} />
      {t(sevLabelKey[sev])} <b className="font-medium text-muted tabular-nums">{count}</b>
    </span>
  );
}

export function GroupHeading({ sev, count, t }: { sev: Severity; count: number; t: Translate }) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="size-2.5" style={{ background: sevColor[sev] }} />
      <span className="text-[13px] font-semibold text-ink">{t(sevLabelKey[sev])}</span>
      <span className="text-[11px] text-muted tabular-nums">{t("unit.finding", { count })}</span>
      <span aria-hidden className="h-px flex-1 bg-hairline" />
    </div>
  );
}
