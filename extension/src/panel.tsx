import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { FindingRow } from "../../src/components/ui/finding-row";
import { OccurrenceStepper } from "../../src/components/ui/occurrence-stepper";
import { SectionKicker } from "../../src/components/ui/section-kicker";
import { StageList } from "../../src/components/ui/scan-stages";
import { WarningList } from "../../src/components/ui/warning-list";
import { buildFindings, type FindingView } from "../../src/lib/report/findings";
import type { KeyboardOccurrence } from "../../src/lib/scan/keyboard";
import type { OverlayMark } from "../../src/lib/scan/dom/overlay";
import type { ScanResult } from "../../src/lib/scan/types";
import { auditScope, focusPathLines } from "./coverage";
import type { AuditStage, HighlightReply, PanelMessage, PanelState } from "./state";

const STAGES = [
  "Checking page structure",
  "Running accessibility rules",
  "Walking the focus path",
  "Preparing the report",
] as const;

const QUICK_STAGES = [
  "Checking page structure",
  "Running accessibility rules",
  "Preparing the report",
] as const;

const STAGE_INDEX: Record<AuditStage, number> = {
  structure: 0,
  rules: 1,
  focus: 2,
  report: 3,
};

function send(message: PanelMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message).catch(() => undefined);
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-canvas pb-4 font-sans text-ink">{children}</main>;
}

function StickyBar({ title, score, onTop }: { title: string; score?: number; onTop?: () => void }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-canvas px-3 py-2">
      <h1 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{title}</h1>
      {typeof score === "number" && onTop && (
        <button
          type="button"
          onClick={onTop}
          className="shrink-0 cursor-pointer border border-border bg-surface px-2 py-1 font-cond text-[13px] font-semibold text-ink tabular-nums hover:bg-band"
        >
          {score}
          <span className="sr-only"> out of 100 — back to the summary</span>
        </button>
      )}
    </div>
  );
}

function Header({ result }: { result: ScanResult }) {
  const scope = auditScope(result);

  return (
    <section className="mt-3 border border-border bg-surface p-3" aria-labelledby="score-heading">
      <SectionKicker as="h2" id="score-heading">
        {scope.kicker}
      </SectionKicker>
      {scope.lead && (
        <p className="mt-0.5 text-[12.5px] font-semibold text-moderate-text">{scope.lead}</p>
      )}
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-cond text-[40px] leading-none text-ink tabular-nums">
          {result.score}
        </span>
        <span className="text-[12.5px] text-muted">/100</span>
      </div>

      <p className="mt-1.5 text-[12.5px] leading-normal font-medium text-moderate-text">
        {scope.summary}
      </p>
      {scope.badge && <p className="mt-0.5 text-[12px] text-muted">{scope.badge}</p>}

      <dl className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-muted">
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
          <div key={label} className="whitespace-nowrap">
            <dt className="inline font-semibold text-ink tabular-nums">{n}</dt>{" "}
            <dd className="inline">{label}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2.5 text-[13px] leading-[1.55] text-body">{result.summary}</p>
    </section>
  );
}

function Collapsed({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="mt-1 border-t border-hairline px-3 py-2.5">
      <summary className="cursor-pointer text-[13px] font-semibold text-ink">
        <h2 className="inline text-[13px] font-semibold">{title}</h2>
        {note && <span className="ml-2 font-normal text-muted">{note}</span>}
      </summary>
      <div className="mt-2.5">{children}</div>
    </details>
  );
}

function Capture({ result }: { result: ScanResult }) {
  if (!result.screenshot) return null;
  const marked = result.markers.length;

  return (
    <Collapsed
      title="Evidence"
      note={`viewport screenshot${marked > 0 ? ` · ${marked} marked` : ""}`}
    >
      <div className="relative border border-hairline">
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
    </Collapsed>
  );
}

const PRIMARY_BUTTON =
  "w-full cursor-pointer bg-ink px-3 py-2 text-[13px] font-semibold text-surface hover:bg-ink-2 disabled:cursor-default disabled:bg-canvas disabled:text-disabled";

const SECONDARY_BUTTON =
  "w-full cursor-pointer border border-ink bg-surface px-3 py-2 text-[13px] font-semibold text-ink hover:bg-band";

const SMALL_BUTTON =
  "cursor-pointer border border-border bg-canvas px-2 py-1 text-[11.5px] font-semibold text-ink hover:bg-band disabled:cursor-default disabled:text-disabled";

function CopyButton({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <button
      type="button"
      aria-label={label}
      className={`${SMALL_BUTTON} ${className ?? ""}`}
      onClick={() =>
        navigator.clipboard.writeText(value).then(
          () => setState("done"),
          () => setState("failed"),
        )
      }
    >
      {state === "done" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <SectionKicker as="h4">{label}</SectionKicker>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Occurrences({
  finding,
  syncStop,
  onLocate,
}: {
  finding: FindingView;
  syncStop: number | null;
  onLocate: (occurrence: KeyboardOccurrence) => Promise<string | null>;
}) {
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState(syncStop);
  const total = finding.occurrences.length;
  if (syncStop !== lastSync) {
    setLastSync(syncStop);
    const found = finding.occurrences.findIndex((o) => o.stop === syncStop);
    if (found >= 0) setIndex(found);
  }

  const at = Math.min(index, total - 1);
  const occurrence = finding.occurrences[at];
  if (!occurrence) return null;

  const step = (delta: number) => {
    setNotice(null);
    setIndex((i) => (i + delta + total) % total);
  };

  const locate = async () => {
    setBusy(true);
    setNotice(await onLocate(occurrence));
    setBusy(false);
  };

  const truncated = occurrence.html?.includes("…") ?? false;
  const where = [
    occurrence.stop === null ? "Never reached by Tab" : `Stop ${occurrence.stop}`,
    occurrence.tag ? `<${occurrence.tag}>` : null,
    occurrence.label || null,
  ].filter(Boolean);

  return (
    <section className="mt-4 border-t border-hairline pt-3" aria-label="Occurrences">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionKicker as="h4">
          Occurrence {at + 1} of {total}
        </SectionKicker>
        {total > 1 && (
          <OccurrenceStepper
            index={at}
            total={total}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
          />
        )}
      </div>

      <p className="mt-2 text-[12px] leading-normal break-words text-muted">{where.join(" · ")}</p>

      <Field label="Evidence">
        <p className="text-[13px] leading-[1.55] break-words text-body">{occurrence.reason}</p>
        {occurrence.certainty === "needs-review" && (
          <p className="mt-1.5 text-[12px] leading-normal text-moderate-text">
            Geometry alone cannot settle this one — check it against the reading order you intend.
          </p>
        )}
      </Field>

      {occurrence.rect && (
        <Field label="Position">
          <p className="text-[12px] text-muted tabular-nums">
            {Math.round(occurrence.rect.w)}×{Math.round(occurrence.rect.h)}px at{" "}
            {Math.round(occurrence.rect.x)}, {Math.round(occurrence.rect.y)}
            {occurrence.onScreen ? "" : " · outside the viewport when it was measured"}
          </p>
        </Field>
      )}

      <Field label="Element">
        <p className="overflow-x-auto font-mono text-[12px] break-all text-steel">
          {occurrence.selector}
        </p>
        {occurrence.html && (
          <pre className="mt-1.5 max-h-40 overflow-auto bg-code p-2 font-mono text-[12px] break-all whitespace-pre-wrap text-ink">
            {occurrence.html}
          </pre>
        )}
        {truncated && (
          <p className="mt-1.5 text-[12px] leading-normal text-muted">
            Abbreviated with … , and attributes that can carry what you typed are left out.
            Evidence, not markup to paste back.
          </p>
        )}
      </Field>

      <button
        type="button"
        className={`${PRIMARY_BUTTON} mt-3`}
        disabled={busy}
        onClick={() => void locate()}
      >
        {busy ? "Looking for it…" : "Locate on page"}
      </button>

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <CopyButton label="Copy selector" value={occurrence.selector} />
        {occurrence.html && <CopyButton label="Copy HTML" value={occurrence.html} />}
      </div>

      {notice && (
        <p role="status" className="mt-2 text-[12.5px] leading-normal text-moderate-text">
          {notice}
        </p>
      )}
    </section>
  );
}

function Findings({
  findings,
  syncStop,
  onLocate,
}: {
  findings: FindingView[];
  syncStop: number | null;
  onLocate: (occurrence: KeyboardOccurrence) => Promise<string | null>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState(syncStop);

  if (syncStop !== lastSync) {
    setLastSync(syncStop);
    const owner = findings.find((f) => f.occurrences.some((o) => o.stop === syncStop));
    if (owner) setSelected(owner.id);
  }

  return (
    <section className="mt-3 border border-border bg-surface" aria-labelledby="findings-heading">
      <div className="border-b border-border px-3 py-2">
        <SectionKicker as="h2" id="findings-heading">
          Findings · {findings.length}
        </SectionKicker>
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
              <div className="border-x border-b border-hairline bg-surface px-3 pt-2 pb-3">
                {f.contexts.length > 0 && (
                  <p className="text-[12px] text-muted">Also fails in {f.contexts.join(", ")}</p>
                )}
                <Field label="Problem">
                  <p className="text-[13px] leading-[1.55] break-words text-body">{f.desc}</p>
                </Field>
                <Field label="Suggested fix">
                  <p className="text-[13px] leading-[1.55] break-words text-body">{f.fixText}</p>
                  {f.fixCode && (
                    <pre className="mt-1.5 overflow-x-auto bg-code p-2 font-mono text-[12px] text-ink">
                      {f.fixCode}
                    </pre>
                  )}
                </Field>
                <Occurrences finding={f} syncStop={syncStop} onLocate={onLocate} />
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
}

function ChecksPerformed({ result }: { result: ScanResult }) {
  const primed = !(result.warnings ?? []).some((w) => w.code === "lazy-content-skipped");
  const ran = [
    primed ? "Walked the page first so content that renders on scroll was read" : null,
    "axe-core, WCAG A and AA (2.0, 2.1, 2.2) plus best practice",
    "Target size (WCAG 2.5.8)",
    "Live regions (WCAG 4.1.3)",
    result.screenshot ? "Screenshot of the visible viewport" : null,
    result.keyboard
      ? result.keyboard.truncated
        ? "Focus path with real Tab presses (stopped early)"
        : "Focus path with real Tab presses"
      : null,
  ].filter((x): x is string => x !== null);

  return (
    <Collapsed title="Checks performed" note={`${ran.length}`}>
      <ul className="list-disc space-y-1 pl-4 text-[12.5px] leading-[1.5] text-body">
        {ran.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Collapsed>
  );
}

function marksFor(result: ScanResult): OverlayMark[] {
  const keyboard = result.keyboard;
  if (!keyboard) return [];
  const jumped = new Set(
    (keyboard.findings.find((f) => f.id === "focus-order")?.occurrences ?? [])
      .map((o) => o.stop)
      .filter((n): n is number => n !== null),
  );

  return keyboard.focusPath.map((s) => ({
    n: s.n,
    selector: s.selector,
    kind: !s.focusVisible ? "failure" : jumped.has(s.n) ? "attention" : "stop",
    label: !s.focusVisible
      ? "no focus ring"
      : jumped.has(s.n)
        ? "check order"
        : (s.label || "stop").slice(0, 28),
  }));
}

const NEIGHBOURS = 2;

function windowAround(marks: OverlayMark[], at: number): OverlayMark[] {
  return marks
    .filter((m) => Math.abs(m.n - at) <= NEIGHBOURS)
    .map((m) => (m.n === at ? m : { ...m, kind: "stop" as const }));
}

function FocusPath({
  result,
  error,
  notice,
  showing,
  at,
  complete,
  moved,
  onWalk,
  onShow,
  onStep,
  onToggleComplete,
  onClear,
  onRestoreScroll,
}: {
  result: ScanResult;
  error?: string;
  notice: string | null;
  showing: boolean;
  at: number;
  complete: boolean;
  moved: boolean;
  onWalk: () => void;
  onShow: () => void;
  onStep: (delta: number) => void;
  onToggleComplete: () => void;
  onClear: () => void;
  onRestoreScroll: () => void;
}) {
  const walked = result.keyboard;
  const stops = walked?.focusPath.length ?? 0;
  const lines = walked ? focusPathLines(walked) : null;

  return (
    <section className="mt-3 border-t border-hairline px-3 pt-3" aria-labelledby="focus-heading">
      <SectionKicker as="h2" id="focus-heading">
        Focus path
      </SectionKicker>

      {walked && lines ? (
        <p className="mt-1.5 text-[12.5px] leading-normal text-body">{lines.line}</p>
      ) : (
        <p className="mt-1.5 text-[12.5px] leading-normal text-body">
          This reading has no focus path. Walking it attaches Chrome&apos;s debugger for the length
          of the walk — Chrome shows its own banner meanwhile — types Tab into the page, and puts
          focus and scroll back afterwards.
        </p>
      )}

      {lines?.notes.map((note) => (
        <p key={note} className="mt-1.5 text-[12px] leading-normal text-moderate-text">
          {note}
        </p>
      ))}

      {error && (
        <p role="alert" className="mt-2 text-[12.5px] leading-normal text-critical">
          {error}
        </p>
      )}

      {walked && stops > 0 && (
        <>
          {!showing ? (
            <button type="button" onClick={onShow} className={`${SECONDARY_BUTTON} mt-3`}>
              Show focus path
            </button>
          ) : (
            <>
              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous stop"
                  className={`${SMALL_BUTTON} flex-1`}
                  onClick={() => onStep(-1)}
                >
                  Previous
                </button>
                <span
                  aria-live="polite"
                  className="min-w-24 text-center font-cond text-[13px] font-semibold text-ink tabular-nums"
                >
                  Stop {at} of {stops}
                </span>
                <button
                  type="button"
                  aria-label="Next stop"
                  className={`${SMALL_BUTTON} flex-1`}
                  onClick={() => onStep(1)}
                >
                  Next
                </button>
              </div>

              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button type="button" className={SMALL_BUTTON} onClick={onToggleComplete}>
                  {complete ? "Show nearby stops only" : "Show complete path"}
                </button>
                <button type="button" className={SMALL_BUTTON} onClick={onClear}>
                  Clear overlay
                </button>
                {moved && (
                  <button type="button" className={SMALL_BUTTON} onClick={onRestoreScroll}>
                    Back to where you were
                  </button>
                )}
              </div>

              <p className="mt-1.5 text-[11.5px] leading-normal text-muted">
                {complete
                  ? "Every stop is drawn. The current one is highlighted; the rest are dimmed."
                  : `Drawing the current stop and ${NEIGHBOURS} either side, so the page stays readable.`}
              </p>
            </>
          )}
        </>
      )}

      {notice && <p className="mt-2 text-[12px] leading-normal text-moderate-text">{notice}</p>}

      {!walked && (
        <button type="button" onClick={onWalk} className={`${PRIMARY_BUTTON} mt-3`}>
          Walk the focus path now
        </button>
      )}
    </section>
  );
}

function Running({
  url,
  mode,
  stage,
}: {
  url: string;
  mode: "expanded" | "quick";
  stage: AuditStage;
}) {
  const stages = mode === "quick" ? QUICK_STAGES : STAGES;
  const current = mode === "quick" && stage === "report" ? stages.length - 1 : STAGE_INDEX[stage];

  return (
    <>
      <StickyBar title={mode === "quick" ? "Quick audit" : "Auditing this tab"} />
      <div className="px-3 pt-3">
        <p className="truncate font-mono text-[12px] text-muted">{url}</p>
        <div className="mt-3 border border-border bg-surface p-3">
          <StageList stages={stages} current={current} />
        </div>
        <p className="mt-3 text-[12.5px] leading-[1.5] text-muted">
          The score appears when every step above has finished. The page is not modified.
          {mode === "expanded"
            ? " Walking the focus path attaches Chrome's debugger for that step only — Chrome shows its own banner meanwhile — and it is released before the report appears."
            : ""}
        </p>
      </div>
    </>
  );
}

function Report({
  result,
  deepError,
  onReaudit,
  onQuick,
  onWalk,
  draw,
  clear,
  restoreScroll,
}: {
  result: ScanResult;
  deepError?: string;
  onReaudit: () => void;
  onQuick: () => void;
  onWalk: () => void;
  draw: (
    marks: OverlayMark[],
    focus: number | null,
    timeoutMs: number,
  ) => Promise<{ notice: string | null; moved: boolean }>;
  clear: () => void;
  restoreScroll: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [moved, setMoved] = useState(false);
  const [at, setAt] = useState(1);
  const [syncStop, setSyncStop] = useState<number | null>(null);
  const marks = marksFor(result);
  const scope = auditScope(result);

  const locate = async (occurrence: KeyboardOccurrence) => {
    setShowing(false);
    setNotice(null);
    const mark: OverlayMark = {
      n: occurrence.stop ?? 1,
      selector: occurrence.selector,
      kind: occurrence.certainty === "conclusive" ? "failure" : "attention",
      label: occurrence.label || undefined,
    };
    const done = await draw([mark], mark.n, 6000);
    setMoved(done.moved);
    return done.notice;
  };

  const showPath = async (focus: number, everything = complete) => {
    const next = Math.min(Math.max(focus, 1), marks.length);
    setAt(next);
    setShowing(true);
    setSyncStop(next);
    const done = await draw(everything ? marks : windowAround(marks, next), next, 0);
    setMoved(done.moved);
    setNotice(done.notice);
  };

  return (
    <>
      <StickyBar
        title={result.title}
        score={result.score}
        onTop={() => window.scrollTo({ top: 0, behavior: "instant" })}
      />
      <div className="px-3">
        <p className="mt-2 truncate font-mono text-[12px] text-muted">{result.finalUrl}</p>
        <Header result={result} />
        <Findings findings={buildFindings(result)} syncStop={syncStop} onLocate={locate} />
        <FocusPath
          result={result}
          error={deepError}
          notice={notice}
          showing={showing}
          at={at}
          complete={complete}
          moved={moved}
          onWalk={onWalk}
          onShow={() => void showPath(at)}
          onStep={(delta) => void showPath(((at - 1 + delta + marks.length) % marks.length) + 1)}
          onToggleComplete={() => {
            const next = !complete;
            setComplete(next);
            void showPath(at, next);
          }}
          onClear={() => {
            setShowing(false);
            setNotice(null);
            setSyncStop(null);
            setMoved(false);
            clear();
          }}
          onRestoreScroll={() => {
            restoreScroll();
            setMoved(false);
          }}
        />
      </div>

      <Collapsed title="Coverage limitations" note={scope.summary}>
        <p className="text-[13px] leading-[1.55] text-body">{scope.note}</p>
        <div className="mt-2.5">
          <WarningList
            warnings={result.warnings ?? []}
            title="Not checked in this build"
            note="A reading from this build is never a clean bill of health for the page."
          />
        </div>
      </Collapsed>

      <ChecksPerformed result={result} />
      <Capture result={result} />

      <div className="mt-4 border-t border-hairline px-3 pt-3">
        <button type="button" onClick={onReaudit} className={PRIMARY_BUTTON}>
          Audit this tab again
        </button>
        <button
          type="button"
          onClick={onQuick}
          aria-describedby="quick-audit-note"
          className={`${SECONDARY_BUTTON} mt-2`}
        >
          Run quick audit
        </button>
        <p id="quick-audit-note" className="mt-1.5 text-center text-[12px] text-muted">
          No debugger or keyboard focus path
        </p>
      </div>
    </>
  );
}

function Message({
  kicker,
  title,
  body,
  children,
}: {
  kicker: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <StickyBar title={kicker} />
      <div className="px-3 pt-3">
        <div className="border border-border bg-surface p-4">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <p className="mt-1.5 text-[13px] leading-[1.55] text-body">{body}</p>
        </div>
        {children}
      </div>
    </>
  );
}

function Panel() {
  const [state, setState] = useState<PanelState>({ kind: "idle" });
  const port = useRef<chrome.runtime.Port | null>(null);

  const keepPort = () => {
    if (port.current) return;
    const opened = chrome.runtime.connect({ name: "panel" });
    opened.onDisconnect.addListener(() => {
      if (port.current === opened) port.current = null;
    });
    port.current = opened;
  };

  useEffect(() => {
    const listener = (message: PanelMessage) => {
      if (message.type === "panel:state") setState(message.state);
    };
    chrome.runtime.onMessage.addListener(listener);
    keepPort();
    chrome.runtime.sendMessage({ type: "panel:hello" } satisfies PanelMessage).then(
      (current: PanelState | undefined) => {
        if (current) setState(current);
      },
      () => {},
    );
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      port.current?.disconnect();
    };
  }, []);

  const draw = async (
    marks: OverlayMark[],
    focus: number | null,
    timeoutMs: number,
  ): Promise<{ notice: string | null; moved: boolean }> => {
    keepPort();
    const reply = (await send({
      type: "panel:highlight",
      marks,
      focus,
      scroll: focus !== null,
      timeoutMs,
    })) as HighlightReply | undefined;

    if (!reply) return { notice: "The page could not be reached from here.", moved: false };
    if (!reply.ok) return { notice: reply.message, moved: false };

    const { missing, offScreen, focused, movedScroll } = reply.report;
    const notice = !focused
      ? null
      : !focused.found
        ? "That element is no longer in the page: the DOM changed since the audit ran."
        : missing.length > 0
          ? `${missing.length} of ${missing.length + reply.report.drawn} stops are no longer in the page, so they could not be drawn.`
          : offScreen.length > 0 && marks.length > 1
            ? `${offScreen.length} of ${marks.length} stops are outside the viewport right now, so only the rest are drawn.`
            : null;

    return { notice, moved: movedScroll };
  };

  const running = state.kind === "running";

  return (
    <Shell>
      <div role="status" aria-live="polite" className="sr-only">
        {running
          ? `Auditing. Step ${STAGE_INDEX[state.stage] + 1}: ${STAGES[STAGE_INDEX[state.stage]]}.`
          : ""}
      </div>

      {state.kind === "idle" && (
        <Message
          kicker="AccessCheck"
          title="Nothing audited yet"
          body="Click the AccessCheck icon in the toolbar to audit the page you are on. The audit runs the rules and then walks the focus path, which attaches Chrome's debugger for that step. Nothing leaves your browser."
        />
      )}

      {state.kind === "running" && (
        <Running url={state.url} mode={state.mode} stage={state.stage} />
      )}

      {state.kind === "unsupported" && (
        <Message
          kicker="Not supported here"
          title="This page cannot be audited"
          body={state.reason}
        />
      )}

      {state.kind === "error" && (
        <Message kicker="Audit failed" title="The audit could not finish" body={state.message}>
          {state.recoverable && (
            <button
              type="button"
              onClick={() => void send({ type: "panel:audit", deep: true })}
              className={`${PRIMARY_BUTTON} mt-3`}
            >
              Try again
            </button>
          )}
        </Message>
      )}

      {state.kind === "done" && (
        <Report
          result={state.result}
          deepError={state.deepError}
          onReaudit={() => void send({ type: "panel:audit", deep: true })}
          onQuick={() => void send({ type: "panel:audit", deep: false })}
          onWalk={() => void send({ type: "panel:focus-path" })}
          draw={draw}
          clear={() => void send({ type: "panel:clear-highlight" })}
          restoreScroll={() => void send({ type: "panel:restore-scroll" })}
        />
      )}
    </Shell>
  );
}

createRoot(document.getElementById("root")!).render(<Panel />);
