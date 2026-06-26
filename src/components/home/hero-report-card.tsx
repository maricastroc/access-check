import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";
import { BrowserFrame, ScoreRing, StatusPill } from "@/components/ui";
import { reportRows } from "./content";

/** Mockup do relatório exibido ao lado do hero. */
export function HeroReportCard() {
  return (
    <BrowserFrame url="yourwebsite.com" trailing="Report">
      <div className="p-6">
        {/* Score */}
        <div className="flex items-center gap-5">
          <ScoreRing value={94} />
          <div>
            <h3 className="text-lg font-semibold text-ink">
              Accessibility score
            </h3>
            <p className="mt-1 text-sm leading-5 text-muted">
              Page audited against 38 WCAG 2.1 success criteria.
            </p>
          </div>
        </div>

        {/* Linhas */}
        <div className="mt-6 divide-y divide-line">
          {reportRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-3.5"
            >
              <span className="text-[15px] font-medium text-ink">
                {row.label}
              </span>
              <StatusPill tone={row.tone}>{row.status}</StatusPill>
            </div>
          ))}
        </div>

        {/* Rodapé — simulação de visão */}
        <div className="mt-4 flex items-center gap-2.5 rounded-field border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm">
          <FontAwesomeIcon icon={faEye} className="text-sm text-brand-600" />
          <span className="text-ink-soft">Simulating vision:</span>
          <span className="font-medium text-brand-600">Deuteranopia</span>
        </div>
      </div>
    </BrowserFrame>
  );
}
