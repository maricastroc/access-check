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
  return <div className="min-h-screen bg-canvas p-3 font-sans text-ink">{children}</div>;
}

function Header({ result }: { result: ScanResult }) {
  const scope = auditScope(result);

  return (
    <div className="border border-border bg-surface p-3">
      <SectionKicker>{scope.kicker}</SectionKicker>
      {scope.lead && (
        <p className="mt-0.5 text-[12px] font-semibold text-moderate-text">{scope.lead}</p>
      )}
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-cond text-[40px] leading-none text-ink tabular-nums">
          {result.score}
        </span>
        <span className="text-[12px] text-muted">/100</span>
      </div>

      <p className="mt-1.5 text-[12px] leading-normal font-medium text-moderate-text">
        {scope.summary}
      </p>
      {scope.badge && <p className="mt-0.5 text-[11.5px] text-muted">{scope.badge}</p>}

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
    <details className="mt-3 border border-border bg-surface px-3 py-2">
      <summary className="cursor-pointer text-[12.5px] font-semibold text-ink">
        {title}
        {note && <span className="ml-2 font-normal text-muted">{note}</span>}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
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

  return (
    <div className="mt-2.5 border-t border-hairline pt-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionKicker>
          Occurrence {at + 1} of {total}
        </SectionKicker>
        <OccurrenceStepper
          index={at}
          total={total}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />
      </div>

      <p className="mt-2 text-[12px] text-muted">
        {occurrence.stop === null ? "Never reached by Tab" : `Stop ${occurrence.stop}`}
        {occurrence.tag ? ` · <${occurrence.tag}>` : ""}
        {occurrence.label ? ` · ${occurrence.label}` : ""}
        {occurrence.certainty === "needs-review" ? " · needs a human check" : ""}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-normal text-body">{occurrence.reason}</p>
      {occurrence.rect && (
        <p className="mt-1.5 text-[11.5px] text-muted tabular-nums">
          {Math.round(occurrence.rect.w)}×{Math.round(occurrence.rect.h)}px at{" "}
          {Math.round(occurrence.rect.x)}, {Math.round(occurrence.rect.y)}
          {occurrence.onScreen ? "" : " · was outside the viewport when it was measured"}
        </p>
      )}

      <div className="mt-2">
        <SectionKicker>Selector</SectionKicker>
        <p className="mt-1 overflow-x-auto font-mono text-[11.5px] break-all text-steel">
          {occurrence.selector}
        </p>
      </div>

      {occurrence.html && (
        <div className="mt-2">
          <SectionKicker>{truncated ? "Element · abbreviated" : "Element"}</SectionKicker>
          <pre className="mt-1 max-h-32 overflow-auto bg-code p-2 font-mono text-[11.5px] break-all whitespace-pre-wrap text-ink">
            {occurrence.html}
          </pre>
          {truncated && (
            <p className="mt-1 text-[11px] text-muted">
              Long attributes and text are cut short with … , and attributes that can carry what you
              typed are left out. Copy this as evidence, not as markup to paste back.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        className="mt-2.5 w-full cursor-pointer bg-ink px-3 py-2 text-[12.5px] font-semibold text-surface hover:bg-ink-2 disabled:cursor-default disabled:bg-canvas disabled:text-disabled"
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
        <p role="status" className="mt-1.5 text-[12px] leading-normal text-moderate-text">
          {notice}
        </p>
      )}
    </div>
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
                <p className="mt-1.5 text-[12.5px] leading-normal text-body">{f.desc}</p>
                <div className="mt-2">
                  <SectionKicker>Suggested fix</SectionKicker>
                  <p className="mt-1 text-[12.5px] leading-normal text-body">{f.fixText}</p>
                  {f.fixCode && (
                    <pre className="mt-1.5 overflow-x-auto bg-code p-2 font-mono text-[11.5px] text-ink">
                      {f.fixCode}
                    </pre>
                  )}
                </div>
                <Occurrences finding={f} syncStop={syncStop} onLocate={onLocate} />
              </div>
            )}
          </div>
        ))
      )}
    </div>
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
    <div className="mt-3 border border-border bg-surface p-3">
      <SectionKicker>Focus path</SectionKicker>

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
            <button
              type="button"
              onClick={onShow}
              className="mt-2.5 w-full cursor-pointer bg-ink px-3 py-2 text-[12.5px] font-semibold text-surface hover:bg-ink-2"
            >
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
        <button
          onClick={onWalk}
          className="mt-2.5 w-full cursor-pointer bg-ink px-3 py-2 text-[13px] font-semibold text-surface hover:bg-ink-2"
        >
          Walk the focus path now
        </button>
      )}
    </div>
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
    <div className="border border-border bg-surface p-4">
      <SectionKicker>{mode === "quick" ? "Quick audit" : "Expanded audit"}</SectionKicker>
      <p className="mt-1.5 truncate font-mono text-[11.5px] text-muted">{url}</p>
      <div className="mt-2.5">
        <StageList stages={stages} current={current} />
      </div>
      <p className="mt-2.5 border-t border-hairline pt-2.5 text-[12px] leading-normal text-muted">
        The score appears when every step above has finished. The page is not modified.
        {mode === "expanded"
          ? " Walking the focus path attaches Chrome's debugger for that step only — Chrome shows its own banner meanwhile — and it is released before the report appears."
          : ""}
      </p>
    </div>
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
      <div className="mb-3">
        <p className="truncate text-[13px] font-semibold text-ink">{result.title}</p>
        <p className="truncate font-mono text-[11.5px] text-muted">{result.finalUrl}</p>
      </div>

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

      <Collapsed title="Coverage limitations" note={scope.summary}>
        <p className="text-[12.5px] leading-normal text-body">{scope.note}</p>
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

      <button
        onClick={onReaudit}
        className="mt-3 w-full cursor-pointer bg-ink px-3 py-2 text-[13px] font-semibold text-surface hover:bg-ink-2"
      >
        Audit this tab again
      </button>
      <button
        type="button"
        onClick={onQuick}
        aria-describedby="quick-audit-note"
        className="mt-2 w-full cursor-pointer border-2 border-ink bg-surface px-3 py-2 text-[13px] font-semibold text-ink hover:bg-band"
      >
        Run quick audit
      </button>
      <p id="quick-audit-note" className="mt-1 text-center text-[11.5px] text-muted">
        No debugger or keyboard focus path
      </p>
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
        <>
          <Message kicker="Audit failed" title="The audit could not finish" body={state.message} />
          {state.recoverable && (
            <button
              onClick={() => void send({ type: "panel:audit", deep: true })}
              className="mt-3 w-full cursor-pointer bg-ink px-3 py-2 text-[13px] font-semibold text-surface hover:bg-ink-2"
            >
              Try again
            </button>
          )}
        </>
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
