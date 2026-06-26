import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faEye } from "@fortawesome/free-solid-svg-icons";
import { BrowserFrame, ConformanceLadder, StatusPill } from "@/components/ui";
import { conformanceLevels, reportRows } from "./content";

/** Issues = laranja (segunda cor do sistema, ao lado de azul/verde). */
const ISSUE = "#f2820a";

/** Mockup do relatório exibido ao lado do hero. */
export function HeroReportCard() {
  return (
    <BrowserFrame
      url="yourwebsite.com"
      trailing="Report"
      className="border-line-strong shadow-[0_1px_2px_rgba(16,18,29,.05),0_28px_64px_-22px_rgba(16,18,29,.32)]"
      chromeClassName="border-line-strong bg-[#f1f3f6]"
    >
      <div className="bg-linear-to-b from-card to-canvas/50 p-6">
        {/* Assinatura: escada de conformidade + passport */}
        <div className="flex items-stretch gap-5">
          <ConformanceLadder levels={conformanceLevels} className="w-28" />
          <div className="flex flex-1 flex-col justify-center">
            <span className="text-[11px] font-semibold tracking-[0.16em] text-brand-600 uppercase">
              Accessibility Passport
            </span>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {conformanceLevels.map((lvl) => (
                <li key={lvl.id} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={
                      lvl.passed
                        ? "flex size-5 items-center justify-center rounded-full bg-success text-white"
                        : "flex size-5 items-center justify-center rounded-full border-2 border-dashed border-warning"
                    }
                  >
                    {lvl.passed && (
                      <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                    )}
                  </span>
                  <span className="w-8 font-bold tracking-wide text-ink">
                    {lvl.id}
                  </span>
                  <span
                    className={
                      lvl.passed
                        ? "font-medium text-success"
                        : "font-medium text-warning"
                    }
                  >
                    {lvl.passed ? "Pass" : `${lvl.value}%`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Chip de contraste real — issues em laranja */}
        <div className="mt-5 flex items-center gap-3 rounded-field border border-line-strong bg-card px-3.5 py-2.5 shadow-soft">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[15px] font-bold text-white"
            style={{ background: "#00a250" }}
          >
            Aa
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[12px] text-ink-soft">
              #fff on #00a250
            </div>
            <div className="text-[11px] text-muted">Contrast ratio</div>
          </div>
          <span className="font-mono text-sm font-semibold" style={{ color: ISSUE }}>
            3.34:1
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: ISSUE }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: ISSUE }}
            />
            Fix
          </span>
        </div>

        {/* Linhas do audit */}
        <div className="mt-3 divide-y divide-line-strong">
          {reportRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-3"
            >
              <span className="text-[15px] font-medium text-ink">
                {row.label}
              </span>
              <StatusPill tone={row.tone}>{row.status}</StatusPill>
            </div>
          ))}
        </div>

        {/* Rodapé — simulação de visão (humaniza a proposta) */}
        <div className="mt-4 flex items-center gap-2.5 rounded-field border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm">
          <FontAwesomeIcon icon={faEye} className="text-sm text-brand-600" />
          <span className="text-ink-soft">Simulating vision:</span>
          <span className="font-medium text-brand-600">Deuteranopia</span>
        </div>
      </div>
    </BrowserFrame>
  );
}
