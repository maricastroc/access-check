import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { FindingRow } from "../../src/components/ui/finding-row";
import { SectionKicker } from "../../src/components/ui/section-kicker";
import { WarningList } from "../../src/components/ui/warning-list";
import { buildFindings, type FindingView } from "../../src/lib/report/findings";
import type { ScanResult } from "../../src/lib/scan/types";
import type { PanelMessage, PanelState } from "./state";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-canvas p-3 font-sans text-ink">{children}</div>;
}

function Header({ result }: { result: ScanResult }) {
  return (
    <div className="border border-border bg-surface p-3">
      <SectionKicker>{result.partial ? "Partial audit score" : "Audit score"}</SectionKicker>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-cond text-[40px] leading-none text-ink tabular-nums">
          {result.score}
        </span>
        <span className="text-[12px] text-muted">/100</span>
      </div>
      {result.partial && (
        <p className="mt-1.5 text-[12px] leading-normal text-serious">
          Some checks did not run in this environment, so this score is not comparable with a full
          audit.
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
        {(
          [
            ["critical", result.counts.critical],
            ["serious", result.counts.serious],
            ["moderate", result.counts.moderate],
            ["minor", result.counts.minor],
            ["passed", result.counts.passed],
            ["best practice", result.counts.bestPractice],
            ["manual review", result.counts.manualReview],
          ] as const
        ).map(([label, n]) => (
          <span key={label}>
            <b className="font-semibold text-ink tabular-nums">{n}</b> {label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[12.5px] leading-normal text-body">{result.summary}</p>
    </div>
  );
}

function Capture({ result }: { result: ScanResult }) {
  if (!result.screenshot) return null;
  const marked = result.markers.length;

  return (
    <details className="mt-3 border border-ink bg-surface">
      <summary className="cursor-pointer px-3 py-2">
        <SectionKicker>Evidence · visible viewport</SectionKicker>
        <span className="ml-2 text-[12px] text-muted">
          screenshot{marked > 0 ? ` · ${marked} marked` : ""}
        </span>
      </summary>
      <div className="relative border-t border-ink">
        {/* eslint-disable-next-line @next/next/no-img-element -- the panel is not a Next page */}
        <img
          src={result.screenshot}
          alt={`Screenshot of ${result.finalUrl}`}
          className="block w-full"
        />
        {result.markers.map((m) => (
          <span
            key={m.n}
            title={`${m.n}. ${m.label}`}
            className="absolute border-2 border-ink"
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: `${m.width}%`,
              height: `${m.height}%`,
              background: "rgba(179,38,30,.14)",
            }}
          />
        ))}
      </div>
    </details>
  );
}

function Findings({ findings }: { findings: FindingView[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="mt-3 border border-border bg-surface">
      <div className="border-b border-border px-3 py-2">
        <SectionKicker>Findings · {findings.length}</SectionKicker>
      </div>
      {findings.length === 0 ? (
        <p className="px-3 py-3 text-[12.5px] text-muted">
          None of the checks this build runs found a failure.
        </p>
      ) : (
        findings.map((f) => (
          <div key={f.id}>
            <FindingRow
              finding={f}
              selected={selected === f.id}
              onSelect={() => setSelected(selected === f.id ? null : f.id)}
            />
            {selected === f.id && (
              <div className="border-x border-b border-hairline bg-surface px-3 pt-1 pb-3">
                <p className="text-[12px] text-muted">
                  {f.severity ?? "best practice"}
                  {f.contexts.length > 0 ? ` · also fails in ${f.contexts.join(", ")}` : ""}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-normal text-body">{f.fixText}</p>
                {f.fixCode && (
                  <pre className="mt-2 overflow-x-auto bg-code p-2 font-mono text-[11.5px] text-ink">
                    {f.fixCode}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ChecksPerformed({ result }: { result: ScanResult }) {
  const ran = [
    "axe-core, WCAG A and AA (2.0, 2.1, 2.2) plus best practice",
    "Target size (WCAG 2.5.8)",
    "Live regions (WCAG 4.1.3)",
    result.screenshot ? "Screenshot of the visible viewport" : null,
  ].filter((x): x is string => x !== null);

  return (
    <details className="mt-3 border border-border bg-surface px-3 py-2">
      <summary className="cursor-pointer text-[12.5px] font-semibold text-ink">
        Checks performed
      </summary>
      <ul className="mt-2 list-disc pl-4 text-[12.5px] leading-relaxed text-body">
        {ran.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

function Report({ result, onReaudit }: { result: ScanResult; onReaudit: () => void }) {
  return (
    <>
      <div className="mb-3">
        <p className="truncate text-[13px] font-semibold text-ink">{result.title}</p>
        <p className="truncate font-mono text-[11.5px] text-muted">{result.finalUrl}</p>
      </div>

      <Header result={result} />
      <Findings findings={buildFindings(result)} />
      <ChecksPerformed result={result} />
      <Capture result={result} />

      <div className="mt-3">
        <WarningList
          warnings={result.warnings ?? []}
          title="Not checked in this build"
          note="A reading from this build is never a clean bill of health for the page."
        />
      </div>

      <button
        onClick={onReaudit}
        className="mt-3 w-full cursor-pointer bg-ink px-3 py-2 text-[13px] font-semibold text-surface hover:bg-ink-2"
      >
        Audit this tab again
      </button>
    </>
  );
}

function Message({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div className="border border-border bg-surface p-4">
      <SectionKicker>{kicker}</SectionKicker>
      <p className="mt-2 text-[14px] font-semibold text-ink">{title}</p>
      <p className="mt-1.5 text-[12.5px] leading-normal text-body">{body}</p>
    </div>
  );
}

function Panel() {
  const [state, setState] = useState<PanelState>({ kind: "idle" });

  useEffect(() => {
    const listener = (message: PanelMessage) => {
      if (message.type === "panel:state") setState(message.state);
    };
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({ type: "panel:hello" } satisfies PanelMessage).then(
      (current: PanelState | undefined) => {
        if (current) setState(current);
      },
      () => {},
    );
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const reaudit = () => {
    void chrome.runtime.sendMessage({ type: "panel:audit" } satisfies PanelMessage).catch(() => {});
  };

  return (
    <Shell>
      <div role="status" aria-live="polite" className="sr-only">
        {state.kind === "loading" ? "Auditing this page." : ""}
      </div>

      {state.kind === "idle" && (
        <Message
          kicker="AccessCheck"
          title="Nothing audited yet"
          body="Click the AccessCheck icon in the toolbar to audit the page you are on. Nothing leaves your browser."
        />
      )}

      {state.kind === "loading" && (
        <Message
          kicker="Working"
          title="Auditing this page…"
          body="Reading the page with axe-core and this project's own rules. The page is not modified."
        />
      )}

      {state.kind === "unsupported" && (
        <Message
          kicker="Not supported here"
          title="This page cannot be audited"
          body={state.reason}
        />
      )}

      {state.kind === "error" && (
        <>
          <Message kicker="Audit failed" title="The audit could not finish" body={state.message} />
          {state.recoverable && (
            <button
              onClick={reaudit}
              className="mt-3 w-full cursor-pointer bg-ink px-3 py-2 text-[13px] font-semibold text-surface hover:bg-ink-2"
            >
              Try again
            </button>
          )}
        </>
      )}

      {state.kind === "done" && <Report result={state.result} onReaudit={reaudit} />}
    </Shell>
  );
}

createRoot(document.getElementById("root")!).render(<Panel />);
