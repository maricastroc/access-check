import type { ScanResult } from "@/lib/scan/types";

export function StatTiles({ result }: { result: ScanResult }) {
  const { counts } = result;
  const compliant = counts.critical === 0 && counts.serious === 0;
  const warnings = counts.serious + counts.moderate + counts.minor;

  const criticalElements = result.violations
    .filter((v) => v.severity === "critical")
    .reduce((sum, v) => sum + v.nodes, 0);
  const warningElements = result.violations
    .filter((v) => v.severity !== "critical")
    .reduce((sum, v) => sum + v.nodes, 0);

  const tiles = [
    {
      label: "Accessibility score",
      value: result.score,
      color: "text-brand-500",
      sub: compliant ? "WCAG AA" : "needs work",
    },
    {
      label: "Critical issues",
      value: counts.critical,
      color: "text-critical",
      sub:
        criticalElements > 0
          ? `${criticalElements} element${criticalElements === 1 ? "" : "s"}`
          : "blocking AA",
    },
    {
      label: "Warnings",
      value: warnings,
      color: "text-serious",
      sub:
        warningElements > 0
          ? `${warningElements} element${warningElements === 1 ? "" : "s"}`
          : "serious + moderate",
    },
    {
      label: "Passed checks",
      value: counts.passed,
      color: "text-success",
      sub: "auto-checks",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-[13px] border border-line bg-card px-3.5 py-3.5 transition-colors hover:border-[#dfe1e6]"
        >
          <div className="text-[10.5px] leading-tight font-medium text-muted sm:h-6.5">
            {t.label}
          </div>
          <div className={`mt-1.5 text-[26px] font-bold tracking-tight ${t.color}`}>{t.value}</div>
          <div className="mt-0.5 text-[10.5px] text-faint">{t.sub}</div>
        </div>
      ))}
    </div>
  );
}
