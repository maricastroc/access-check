import { Fragment, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrandMark } from "../../src/components/ui/brand-mark";
import { StageList } from "../../src/components/ui/scan-stages";
import { WarningList } from "../../src/components/ui/warning-list";
import {
  EvidenceChain,
  FindingList,
  FocusSequence,
  Locus,
  ProblemNav,
  StandingMark,
  Summary,
  Tag,
  sevOf,
  useInvestigation,
  type FindingGroups,
  type Origin,
  type RelatedFinding,
} from "../../src/components/investigation";
import { workQueue, type FindingView } from "../../src/lib/report/findings";
import { describeElement } from "../../src/lib/report/identity";
import {
  appliesToWholePage,
  findingsAtStops,
  firstAtEachStop,
  insideShadowRoot,
  occurrenceTag,
  occurrencesOf,
  type Occurrence,
  type StopFinding,
} from "../../src/lib/report/occurrences";
import { captureOf } from "../../src/lib/scan/placement";
import {
  OVERLAY_PICK,
  OVERLAY_VIEW,
  type OverlayMark,
  type OverlayOptions,
  type OverlayTone,
} from "../../src/lib/scan/dom/overlay";
import { VIEWPORT_CAPTURE, type ScanResult } from "../../src/lib/scan/types";
import { langAttrs, REPORT_LOCALES } from "../../src/lib/i18n/locale";
import type { ReportLocale } from "../../src/lib/i18n/locale";
import { translator } from "../../src/lib/i18n/t";
import { auditScope, focusPathLines, type AuditScope } from "./coverage";
import {
  scoringIsCurrent,
  standingOf,
  STANDING_LABEL,
  type Standing,
} from "../../src/lib/report/standing";
import {
  browserLocale,
  FOLLOW_BROWSER,
  localeOf,
  markLanguageChanged,
  readPreference,
  takeLanguageChanged,
  writePreference,
  type LocalePreference,
} from "./locale-preference";
import type { AuditStage, AuditTask, HighlightReply, PanelMessage, PanelState } from "./state";

type DoneState = Extract<PanelState, { kind: "done" }>;

let UI_LOCALE: ReportLocale = browserLocale();
let t = translator(UI_LOCALE);

let AUDIT_STAGES: readonly string[] = [];
let FOCUS_STAGES: readonly string[] = [];

const NATIVE_NAME: Record<ReportLocale, string> = {
  en: "English",
  "pt-BR": "Português",
};

const STAGE_AT: Record<AuditTask, Partial<Record<AuditStage, number>>> = {
  audit: { structure: 0, rules: 1, report: 2 },
  "focus-path": { focus: 0, report: 1 },
};

const PRIMARY_BUTTON =
  "w-full min-h-10 cursor-pointer bg-ink px-3 py-2 text-[13.5px] font-semibold text-surface hover:bg-ink-2 disabled:cursor-default disabled:bg-band disabled:text-muted";

const SECONDARY_BUTTON =
  "w-full min-h-10 cursor-pointer border border-ink bg-surface px-3 py-2 text-[13.5px] font-semibold text-ink hover:bg-band";

const QUIET_BUTTON =
  "min-h-8 cursor-pointer border border-border bg-surface px-2.5 text-[13.5px] font-semibold text-ink hover:border-ink disabled:cursor-default disabled:text-disabled";

const NEIGHBOURS = 2;
const NEARBY_OCCURRENCES = 24;
const FINDING_KEY = "f:";
const STOP_KEY = "s:";

let drawing: Promise<unknown> = Promise.resolve();
let port: chrome.runtime.Port | null = null;

function keepPort(): void {
  if (port) return;
  const opened = chrome.runtime.connect({ name: "panel" });
  opened.onDisconnect.addListener(() => {
    if (port !== opened) return;
    port = null;
    setTimeout(keepPort, 250);
  });
  port = opened;
}

function send(message: PanelMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message).catch(() => undefined);
}

function LanguageChoice({ preference }: { preference: LocalePreference }) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-hairline px-3 pt-4">
      <label htmlFor="panel-language" className="shrink-0 text-[13.5px] font-semibold text-ink-2">
        {t("language.label")}
      </label>
      <span className="relative ml-auto inline-flex max-w-full min-w-0">
        <select
          id="panel-language"
          value={preference}
          onChange={(e) => {
            const chosen = e.target.value as LocalePreference;
            void writePreference(chosen)
              .then(markLanguageChanged)
              .then(() => location.reload());
          }}
          className="min-h-8 max-w-full min-w-0 cursor-pointer appearance-none border border-border bg-surface pr-9 pl-3 text-[13.5px] text-ink"
        >
          <option value={FOLLOW_BROWSER}>{t("language.followBrowser")}</option>
          {REPORT_LOCALES.map((option) => (
            <option key={option} value={option} lang={option}>
              {NATIVE_NAME[option]}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className="pointer-events-none absolute top-1/2 right-3 h-1.5 w-2.5 -translate-y-1/2 text-ink"
        >
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

function Shell({
  preference,
  children,
}: {
  preference: LocalePreference;
  children: React.ReactNode;
}) {
  return (
    <main className="ac-instrument min-h-screen bg-canvas pb-6 font-sans text-ink">
      {children}
      <LanguageChoice preference={preference} />
    </main>
  );
}

function StickyBar({
  title,
  standing,
  onTop,
  onReaudit,
  busy = false,
}: {
  title?: string;
  standing?: Standing;
  onTop?: () => void;
  onReaudit?: () => void;
  busy?: boolean;
}) {
  const layout = title ? "truncate" : "flex items-center gap-2";
  return (
    <div className="sticky top-0 z-30 flex min-h-12 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-hairline bg-canvas px-3 py-2">
      <h1 className={`min-w-0 flex-1 text-[13.5px] font-semibold text-ink ${layout}`}>
        {title ?? (
          <>
            <BrandMark size={16} />
            AccessCheck
          </>
        )}
      </h1>
      {onReaudit && (
        <button
          type="button"
          onClick={onReaudit}
          disabled={busy}
          className={`${QUIET_BUTTON} shrink-0`}
        >
          {t("panel.reaudit")}
        </button>
      )}
      {standing && onTop && (
        <button
          type="button"
          onClick={onTop}
          className="flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 px-1.5 text-[13.5px] font-semibold text-ink hover:underline"
        >
          <StandingMark standing={standing} size={12} />
          <span className="max-[359px]:sr-only">{t(STANDING_LABEL[standing])}</span>
          <span className="sr-only">{t("panel.backToSummary")}</span>
        </button>
      )}
    </div>
  );
}

function Header({
  result,
  groups,
  selectedId,
  onSelect,
  walking,
  deepError,
  round,
  onWalk,
  onContinue,
  onShowKeyboard,
  notices,
}: {
  result: ScanResult;
  groups: FindingGroups;
  selectedId: string | null;
  onSelect: (id: string) => void;
  walking: AuditStage | null;
  deepError?: string;
  round: RoundOutcome | null;
  onWalk: () => void;
  onContinue: () => void;
  onShowKeyboard: (() => void) | null;
  notices: string[];
}) {
  const scope = auditScope(result, t);
  const standing = standingOf(result.counts);

  return (
    <section className="px-3 pt-4 pb-3" aria-labelledby="verdict-heading">
      <p className="text-[12.5px] font-semibold text-muted">{scope.kicker}</p>
      <div className="mt-1.5">
        <Summary
          standing={standing}
          groups={groups}
          passed={result.counts.passed}
          selectedId={selectedId}
          onSelect={onSelect}
          heading="h2"
          headingId="verdict-heading"
          host={result.title}
          compact
          t={t}
        >
          {notices.map((line) => (
            <p key={line} className="mt-3 text-[13.5px] leading-normal text-steel">
              {line}
            </p>
          ))}
          <KeyboardCheck
            scope={scope}
            walking={walking}
            error={deepError}
            stops={result.keyboard?.focusPath.length ?? 0}
            round={round}
            onWalk={onWalk}
            onContinue={onContinue}
            onShowKeyboard={onShowKeyboard}
          />

          {!scoringIsCurrent(result) && (
            <div className="mt-3 border-l-2 border-dashed border-border pl-3">
              <h3 className="text-[13.5px] font-semibold text-ink-2">{t("standing.staleTitle")}</h3>
              <p className="mt-0.5 text-[13.5px] leading-normal text-ink-2">
                {t("standing.staleBody")}
              </p>
            </div>
          )}
        </Summary>
      </div>
    </section>
  );
}

type RoundOutcome = { checked: number; problems: number };

function KeyboardCheck({
  scope,
  walking,
  error,
  stops,
  round,
  onWalk,
  onContinue,
  onShowKeyboard,
}: {
  scope: AuditScope;
  walking: AuditStage | null;
  error?: string;
  stops: number;
  round: RoundOutcome | null;
  onWalk: () => void;
  onContinue: () => void;
  onShowKeyboard: (() => void) | null;
}) {
  const pending = scope.focusPath === "skipped";
  const cut = scope.focusPath === "truncated";
  const started = scope.focusPath === "partial";
  const outcome = error ? null : round;
  if (!walking && !error && !pending && !cut && !started && !outcome) return null;

  if (walking) {
    return (
      <div className="mt-4 border-t border-hairline pt-3">
        <p className="text-[13.5px] font-semibold text-ink">{t("panel.walkingFocusPath")}</p>
        <StageList stages={FOCUS_STAGES} current={STAGE_AT["focus-path"][walking] ?? 0} />
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-hairline pt-3">
      {outcome && (
        <div role="status" className="mb-3">
          <p className="text-[13.5px] leading-normal text-ink-2">
            {t("panel.roundChecked", { count: outcome.checked })}{" "}
            {outcome.problems > 0
              ? t("panel.roundProblems", { count: outcome.problems })
              : t("panel.roundNoProblems")}
          </p>
          {onShowKeyboard && (
            <button type="button" onClick={onShowKeyboard} className={`${QUIET_BUTTON} mt-2`}>
              {t("panel.showKeyboardProblems")}
            </button>
          )}
        </div>
      )}
      {(pending || cut || started) && (
        <p className="text-[13.5px] leading-normal font-semibold text-steel">
          {pending ? scope.lead : scope.badge}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-[13.5px] leading-normal text-critical-text">
          {error}
        </p>
      )}
      {pending && (
        <>
          <p id="walk-debugger-note" className="mt-1.5 text-[13.5px] leading-normal text-ink-2">
            {t("panel.walkDebuggerNote")}
          </p>
          <button
            type="button"
            onClick={onWalk}
            aria-describedby="walk-debugger-note"
            className={`${SECONDARY_BUTTON} mt-2.5`}
          >
            {t("panel.walkNow")}
          </button>
        </>
      )}
      {cut && (
        <>
          <button
            type="button"
            onClick={onContinue}
            aria-describedby="continue-walk-note"
            className={`${SECONDARY_BUTTON} mt-2.5`}
          >
            {t("panel.continueWalk")}
          </button>
          <p id="continue-walk-note" className="mt-1.5 text-[13.5px] leading-normal text-muted">
            {t("panel.continueWalkNote", { stops })}
          </p>
        </>
      )}
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
    <details className="mt-6 border-t border-hairline px-3 py-3">
      <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span aria-hidden className="ac-chev text-ink-2" />
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {note && <span className="text-[13.5px] text-muted">{note}</span>}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function ChecksPerformed({ result }: { result: ScanResult }) {
  const primed = !(result.warnings ?? []).some((w) => w.code === "lazy-content-skipped");
  const ran = [
    primed ? t("panel.check.primed") : null,
    t("panel.check.axe"),
    t("panel.check.targetSize"),
    t("panel.check.liveRegions"),
    result.screenshot ? t("panel.check.screenshot") : null,
    result.keyboard
      ? result.keyboard.truncated
        ? t("panel.check.focusPathStopped")
        : t("panel.check.focusPath")
      : null,
  ].filter((x): x is string => x !== null);

  return (
    <section className="mt-5" aria-labelledby="about-checks">
      <h3 id="about-checks" className="text-[13.5px] font-semibold text-ink-2">
        {t("panel.checksPerformed")} · {ran.length}
      </h3>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13.5px] leading-normal text-ink-2 marker:text-muted">
        {ran.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function Capture({ result, findings }: { result: ScanResult; findings: FindingView[] }) {
  if (!result.screenshot) return null;
  const marked = result.markers.length;
  const marks = findings.flatMap((f) => {
    const all = occurrencesOf(f);
    return all.flatMap((o) =>
      o.markers
        .filter((m) => captureOf(m) === VIEWPORT_CAPTURE)
        .map((m) => ({
          key: `${f.id}:${o.index}:${m.n}`,
          tag: occurrenceTag(f.n, o.index, all.length),
          sev: sevOf(f),
          box: { left: m.left, top: m.top, width: m.width, height: m.height },
        })),
    );
  });

  return (
    <section className="mt-5" aria-labelledby="about-screenshot">
      <h3 id="about-screenshot" className="text-[13.5px] font-semibold text-ink-2">
        {t("panel.screenshot")}
      </h3>
      <p className="mt-0.5 text-[13.5px] text-muted">
        {marked > 0 ? t("panel.evidenceNoteMarked", { count: marked }) : t("panel.evidenceNote")}
      </p>
      <div className="relative mt-2.5 border border-hairline">
        {/* eslint-disable-next-line @next/next/no-img-element -- the panel is not a Next page */}
        <img
          src={result.screenshot}
          alt={t("panel.screenshotAlt", { url: result.finalUrl })}
          className="block w-full"
        />
        {marks.map((m) => (
          <Fragment key={m.key}>
            <Locus box={m.box} weight="sibling" />
            <span
              aria-hidden
              className="pointer-events-none absolute"
              style={{
                left: `${m.box.left}%`,
                top: `${m.box.top}%`,
                transform: "translate(calc(-50% - 5px), calc(-50% - 5px))",
              }}
            >
              <Tag n={m.tag} sev={m.sev} size={17} onPage />
            </span>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function OnPage({
  busy,
  notice,
  onLocate,
}: {
  busy: boolean;
  notice: string | null;
  onLocate: () => void;
}) {
  return (
    <div className="mt-3.5">
      <button type="button" className={PRIMARY_BUTTON} disabled={busy} onClick={onLocate}>
        {busy ? t("panel.locating") : t("panel.locate")}
      </button>
      <p role="status" className="mt-2 text-[13.5px] leading-normal text-steel empty:mt-0">
        {notice}
      </p>
    </div>
  );
}

function ReadingLanguage({
  locale,
  onReaudit,
}: {
  locale: ReportLocale | undefined;
  onReaudit: () => void;
}) {
  if (!locale || locale === UI_LOCALE) return null;

  return (
    <div className="mx-3 mt-3 border-l-2 border-steel pl-3">
      <p lang={UI_LOCALE} className="text-[13.5px] leading-normal text-ink-2">
        {t("panel.readingLanguage", { language: NATIVE_NAME[locale] })}
      </p>
      <button type="button" onClick={onReaudit} className={`${QUIET_BUTTON} mt-2`}>
        {t("panel.auditAgain")}
      </button>
    </div>
  );
}

function findingMarks(f: FindingView, occurrences: Occurrence[], current: number): OverlayMark[] {
  const total = occurrences.length;
  const tone = sevOf(f);
  return occurrences
    .filter((o) => Math.abs(o.index - current) <= NEARBY_OCCURRENCES)
    .map((o) => ({
      n: o.index + 1,
      selector: o.selector,
      tag: occurrenceTag(f.n, o.index, total),
      tone,
      quiet: o.index !== current,
      ring: f.ruleId === "focus-not-visible" && Math.abs(o.index - current) <= 1,
      label: describeElement(o.selector, o.identity ?? undefined, t).label,
      pick: `${FINDING_KEY}${f.id}:${o.index}`,
    }));
}

function overviewMarks(fix: FindingView[]): OverlayMark[] {
  return fix.flatMap((f) => {
    const [first, ...rest] = occurrencesOf(f);
    if (!first) return [];
    return [
      {
        n: f.n,
        selector: first.selector,
        tag: String(f.n),
        tone: sevOf(f),
        ring: f.ruleId === "focus-not-visible",
        label: f.title,
        pick: `${FINDING_KEY}${f.id}:${first.index}`,
        alternates: rest.map((o) => ({
          selector: o.selector,
          pick: `${FINDING_KEY}${f.id}:${o.index}`,
        })),
      },
    ];
  });
}

type StopAlert = { tone: OverlayTone; tag: string; pick: string };

function stopAlerts(found: StopFinding[], findings: FindingView[]): Map<number, StopAlert> {
  const byId = new Map(findings.map((f) => [f.id, f]));
  const alerts = new Map<number, StopAlert>();
  for (const [stop, first] of firstAtEachStop(found)) {
    const f = byId.get(first.findingId);
    if (!f) continue;
    alerts.set(stop, {
      tone: sevOf(f),
      tag: first.tag,
      pick: `${FINDING_KEY}${f.id}:${first.index}`,
    });
  }
  return alerts;
}

function stopMarks(result: ScanResult, alerts: Map<number, StopAlert>, at: number): OverlayMark[] {
  return (result.keyboard?.focusPath ?? []).map((s) => {
    const alert = alerts.get(s.n);
    const current = s.n === at;
    return {
      n: s.n,
      selector: s.selector,
      tag: String(s.n),
      tone: "path",
      shape: "circle",
      ring: current && !s.focusVisible,
      alert: alert?.tone,
      badge: current && alert ? { tag: alert.tag, tone: alert.tone, pick: alert.pick } : undefined,
      label: s.label || t("panel.mark.stop"),
      pick: `${STOP_KEY}${s.n}`,
    };
  });
}

function windowAround(marks: OverlayMark[], at: number): OverlayMark[] {
  return marks.filter((m) => Math.abs(m.n - at) <= NEIGHBOURS);
}

function wholePath(marks: OverlayMark[], at: number): OverlayMark[] {
  return marks.map((m) => ({ ...m, quiet: Math.abs(m.n - at) > NEIGHBOURS }));
}

function FocusPath({
  result,
  notice,
  showing,
  at,
  complete,
  related,
  onShow,
  onPick,
  onStep,
  onComplete,
  onExit,
}: {
  result: ScanResult;
  notice: string | null;
  showing: boolean;
  at: number;
  complete: boolean;
  related: RelatedFinding[];
  onShow: () => void;
  onPick: (n: number) => void;
  onStep: (delta: 1 | -1) => void;
  onComplete: (on: boolean) => void;
  onExit: () => void;
}) {
  const walked = result.keyboard;
  if (!walked) return null;
  const stops = walked.focusPath;
  const lines = focusPathLines(walked, t);

  return (
    <section className="mt-4 border-t border-hairline px-3 pt-4" aria-labelledby="focus-heading">
      <h2 id="focus-heading" className="text-[15px] font-semibold text-ink">
        {t("panel.focusPath")}
      </h2>

      <p className="mt-1.5 text-[13.5px] leading-normal text-ink-2">{lines.line}</p>

      {lines.notes.map((note) => (
        <p key={note} className="mt-1.5 text-[13.5px] leading-normal text-steel">
          {note}
        </p>
      ))}

      {stops.length > 0 &&
        (!showing ? (
          <button type="button" onClick={onShow} className={`${QUIET_BUTTON} mt-3`}>
            {t("panel.showFocusPath")}
          </button>
        ) : (
          <div className="mt-3">
            <FocusSequence
              stops={stops}
              current={at}
              onPick={onPick}
              onStep={onStep}
              whole={complete}
              onWhole={onComplete}
              related={related}
              t={t}
              status={
                <p className="text-[12.5px] leading-normal text-muted">
                  {complete
                    ? t("panel.drawingAll")
                    : t("panel.drawingWindow", { neighbours: NEIGHBOURS })}
                </p>
              }
            />
            <button type="button" className={`${QUIET_BUTTON} mt-3`} onClick={onExit}>
              {t("panel.exitInspection")}
            </button>
          </div>
        ))}

      <p role="status" className="mt-2 text-[13.5px] leading-normal text-steel empty:mt-0">
        {notice}
      </p>
    </section>
  );
}

function Running({ url, task, stage }: { url: string; task: AuditTask; stage: AuditStage }) {
  const stages = task === "audit" ? AUDIT_STAGES : FOCUS_STAGES;
  const current = STAGE_AT[task][stage] ?? 0;

  return (
    <>
      <StickyBar />
      <div className="px-3 pt-5">
        <h2 className="text-[17px] font-bold text-ink">
          {task === "audit" ? t("panel.auditingTab") : t("panel.walkingFocusPath")}
        </h2>
        <p className="mt-1 truncate font-mono text-[12.5px] text-muted">{url}</p>
        <div className="mt-4">
          <StageList stages={stages} current={current} />
        </div>
        <p className="mt-4 text-[13.5px] leading-normal text-ink-2">
          {task === "audit" ? t("panel.runningNote") : t("panel.runningNoteFocus")}
        </p>
      </div>
    </>
  );
}

type Draw = (marks: OverlayMark[], focus: number | null, opts: OverlayOptions) => Promise<Drawn>;

type Drawn = HighlightReply | null;

function findingNotice(reply: Drawn): string | null {
  if (!reply) return t("panel.pageUnreachable");
  if (!reply.ok) return reply.message;
  const focused = reply.report.focused;
  if (!focused) return null;
  if (!focused.found) return t("panel.elementGone");
  if (focused.hidden) return t("chain.notShowing");
  if (focused.side === "above") return t("chain.offAbove");
  if (focused.side === "below") return t("chain.offBelow");
  if (focused.side === "left" || focused.side === "right") return t("chain.notShowing");
  return null;
}

function pathNotice(marks: OverlayMark[], reply: Drawn): string | null {
  if (!reply) return t("panel.pageUnreachable");
  if (!reply.ok) return reply.message;
  const { missing, offScreen, focused, drawn } = reply.report;
  if (!focused) return null;
  if (!focused.found) return t("panel.elementGone");
  if (missing.length > 0) {
    return t("panel.someStopsGone", { missing: missing.length, total: missing.length + drawn });
  }
  if (offScreen.length > 0 && marks.length > 1) {
    return t("panel.someStopsOffScreen", { offScreen: offScreen.length, total: marks.length });
  }
  return null;
}

function Report({
  result,
  deepError,
  walking,
  onReaudit,
  onWalk,
  onContinue,
  draw,
  restoreScroll,
}: {
  result: ScanResult;
  deepError?: string;
  walking: AuditStage | null;
  onReaudit: () => void;
  onWalk: () => void;
  onContinue: () => void;
  draw: Draw;
  restoreScroll: () => Promise<unknown>;
}) {
  const groups = useMemo(() => workQueue(result), [result]);
  const findings = useMemo(() => groups.flatMap((g) => g.findings), [groups]);
  const overview = useMemo(
    () => overviewMarks(groups.find((g) => g.group === "fix")?.findings ?? []),
    [groups],
  );
  const wholePage = useMemo(
    () => (groups.find((g) => g.group === "fix")?.findings ?? []).filter(appliesToWholePage).length,
    [groups],
  );
  const inShadowRoot = useMemo(
    () => (groups.find((g) => g.group === "fix")?.findings ?? []).filter(insideShadowRoot).length,
    [groups],
  );
  const atStops = useMemo(
    () =>
      findingsAtStops(
        groups.filter((g) => g.group !== "recommend").flatMap((g) => g.findings),
        result.keyboard?.targetStops,
      ),
    [groups, result],
  );
  const alerts = useMemo(() => stopAlerts(atStops, findings), [atStops, findings]);
  const inv = useInvestigation(findings);
  const [onPage, setOnPage] = useState<{ busy: boolean; notice: string | null }>({
    busy: false,
    notice: null,
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [unseen, setUnseen] = useState(0);
  const [away, setAway] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [at, setAt] = useState(1);
  const [roundFrom, setRoundFrom] = useState<number | null>(null);
  const [wasWalking, setWasWalking] = useState(walking !== null);
  const latest = useRef(0);
  const drawn = useRef<"overview" | "finding" | "path" | null>(null);
  const [verdictShown, setVerdictShown] = useState(true);
  const scope = auditScope(result, t);
  const stops = result.keyboard?.focusPath.length ?? 0;

  if ((walking !== null) !== wasWalking) {
    setWasWalking(walking !== null);
    if (walking !== null) setRoundFrom(stops);
  }

  const keyboardProblems = findings.filter((f) => f.kind === "keyboard");
  const round =
    roundFrom !== null && walking === null
      ? { checked: Math.max(0, stops - roundFrom), problems: keyboardProblems.length }
      : null;

  const showFinding = async (f: FindingView, index: number, scroll: boolean) => {
    const ask = ++latest.current;
    drawn.current = "finding";
    setShowing(false);
    setNotice(null);
    setOnPage({ busy: scroll, notice: null });
    const reply = await draw(findingMarks(f, occurrencesOf(f), index), index + 1, {
      scroll,
      path: false,
      timeoutMs: 0,
    });
    if (ask !== latest.current) return;
    setOnPage({ busy: false, notice: findingNotice(reply) });
  };

  const go = (id: string, index = 0, origin: Origin = "nav") => {
    const f = findings.find((x) => x.id === id);
    if (!f) return;
    inv.select(id, index, origin);
    void showFinding(f, index, false);
  };

  const toggle = (id: string) => {
    if (id === inv.selectedId) {
      inv.toggle(id);
      return;
    }
    go(id, 0, "row");
  };

  const pick = (index: number) => {
    if (!inv.selected) return;
    inv.pick(index);
    void showFinding(inv.selected, index, true);
  };

  const locate = () => {
    if (inv.selected) void showFinding(inv.selected, inv.occIndex, true);
  };

  const showOverview = async () => {
    const ask = ++latest.current;
    drawn.current = "overview";
    const reply = await draw(overview, null, { scroll: false, path: false, timeoutMs: 0 });
    if (ask !== latest.current) return;
    setAway(reply?.ok === false ? reply.message : null);
    setUnseen(reply?.ok ? reply.report.missing.length + reply.report.offScreen.length : 0);
  };

  const showPath = async (focus: number, everything = complete, scroll = true) => {
    const next = Math.min(Math.max(focus, 1), stops);
    const ask = ++latest.current;
    drawn.current = "path";
    setAt(next);
    setShowing(true);
    const marks = stopMarks(result, alerts, next);
    const shown = everything ? wholePath(marks, next) : windowAround(marks, next);
    const reply = await draw(shown, next, { scroll, path: true, timeoutMs: 0 });
    if (ask !== latest.current) return;
    setNotice(pathNotice(shown, reply));
  };

  const exitPath = () => {
    ++latest.current;
    drawn.current = null;
    setShowing(false);
    setNotice(null);
    const open = inv.selected;
    const index = inv.occIndex;
    void restoreScroll().then(open ? () => showFinding(open, index, false) : showOverview);
  };

  const pausedForWalk = (start: () => void) => () => {
    ++latest.current;
    drawn.current = null;
    setShowing(false);
    setNotice(null);
    start();
  };

  const related: RelatedFinding[] = atStops.flatMap((r) => {
    const f = findings.find((x) => x.id === r.findingId);
    if (!f) return [];
    return [
      { stop: r.stop, tag: r.tag, sev: sevOf(f), onOpen: () => go(r.findingId, r.index, "stop") },
    ];
  });

  const fromPage = useEffectEvent((key: string) => {
    if (key.startsWith(STOP_KEY)) {
      const n = Number(key.slice(STOP_KEY.length));
      if (Number.isFinite(n) && showing) void showPath(n);
      return;
    }
    if (!key.startsWith(FINDING_KEY)) return;
    const rest = key.slice(FINDING_KEY.length);
    const cut = rest.lastIndexOf(":");
    const index = Number(rest.slice(cut + 1));
    if (cut < 0 || !Number.isInteger(index)) return;
    go(rest.slice(0, cut), index, "mark");
  });

  const redraw = useEffectEvent(() => {
    if (walking !== null) return;
    if (drawn.current === "path") void showPath(at, complete, false);
    else if (drawn.current === "finding" && inv.selected) {
      void showFinding(inv.selected, inv.occIndex, false);
    } else if (drawn.current === "overview") void showOverview();
  });

  useEffect(() => {
    const listener = (message: PanelMessage) => {
      if (message.type === "panel:page-changed") redraw();
      if (message.type === OVERLAY_PICK) fromPage(message.key);
      if (message.type === OVERLAY_VIEW && drawn.current === "overview") {
        setUnseen(message.total - message.shown);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const settle = useEffectEvent(() => {
    if (walking !== null || drawn.current === "path") return;
    if (inv.selected) {
      if (drawn.current !== "finding") void showFinding(inv.selected, inv.occIndex, false);
      return;
    }
    showOverview();
  });

  useEffect(() => {
    settle();
  }, [inv.selectedId, walking, overview]);

  useEffect(() => {
    const heading = document.getElementById("verdict-heading");
    if (!heading) return;
    const watch = new IntersectionObserver(([entry]) => setVerdictShown(entry.isIntersecting), {
      rootMargin: "-48px 0px 0px 0px",
    });
    watch.observe(heading);
    return () => watch.disconnect();
  }, []);

  return (
    <>
      <StickyBar
        title={result.title}
        standing={verdictShown ? undefined : standingOf(result.counts)}
        onTop={() => window.scrollTo({ top: 0, behavior: "instant" })}
        onReaudit={onReaudit}
        busy={walking !== null}
      />
      <p className="mt-2 truncate px-3 font-mono text-[12.5px] text-muted">{result.finalUrl}</p>
      <ReadingLanguage locale={result.locale} onReaudit={onReaudit} />
      <Header
        result={result}
        groups={groups}
        selectedId={inv.selectedId}
        onSelect={(id) => go(id, 0, "index")}
        walking={walking}
        deepError={deepError}
        round={round}
        onWalk={pausedForWalk(onWalk)}
        onContinue={pausedForWalk(onContinue)}
        onShowKeyboard={
          keyboardProblems.length > 0 ? () => go(keyboardProblems[0].id, 0, "nav") : null
        }
        notices={
          inv.selectedId === null && !showing && walking === null
            ? away
              ? [away]
              : [
                  unseen > 0 ? t("panel.notOnScreen", { count: unseen }) : null,
                  wholePage > 0 ? t("panel.wholePage", { count: wholePage }) : null,
                  inShadowRoot > 0 ? t("panel.inShadowRoot", { count: inShadowRoot }) : null,
                ].filter((line): line is string => line !== null)
            : []
        }
      />
      <div className="border-t border-hairline">
        <FindingList
          groups={groups}
          selectedId={inv.selectedId}
          onToggle={toggle}
          compact
          empty={t("panel.noFailures")}
          rowAttrs={langAttrs(result.locale, UI_LOCALE)}
          t={t}
          renderOpen={(f, siblings, i) => (
            <EvidenceChain
              finding={f}
              occurrences={inv.occurrences}
              index={inv.occIndex}
              onPick={pick}
              host={result.title}
              testedOn="page"
              compact
              t={t}
              located={
                inv.occurrences.length > 0 ? (
                  <OnPage busy={onPage.busy} notice={onPage.notice} onLocate={locate} />
                ) : null
              }
              footer={<ProblemNav siblings={siblings} at={i} onGo={(id) => go(id)} t={t} />}
            />
          )}
        />
      </div>
      <FocusPath
        result={result}
        notice={notice}
        showing={showing}
        at={at}
        complete={complete}
        related={related}
        onShow={() => void showPath(at)}
        onPick={(n) => void showPath(n)}
        onStep={(delta) => void showPath(((at - 1 + delta + stops) % stops) + 1)}
        onComplete={(on) => {
          setComplete(on);
          void showPath(at, on);
        }}
        onExit={exitPath}
      />

      <Collapsed title={t("panel.aboutAudit")} note={scope.summary}>
        <section aria-labelledby="about-coverage">
          <h3 id="about-coverage" className="text-[13.5px] font-semibold text-ink-2">
            {t("panel.coverageLimitations")}
          </h3>
          <p className="mt-1 text-[13.5px] leading-normal text-ink-2">{scope.note}</p>
          <div className="mt-2.5">
            <WarningList
              warnings={result.warnings ?? []}
              title={t("panel.notChecked")}
              note={t("panel.notCheckedNote")}
            />
          </div>
        </section>
        <ChecksPerformed result={result} />
        <Capture result={result} findings={findings} />
      </Collapsed>
    </>
  );
}

function Message({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <StickyBar />
      <div className="px-3 pt-5">
        <h2 className="text-[17px] font-bold text-ink">{title}</h2>
        <p className="mt-1.5 text-[15px] leading-normal text-ink-2">{body}</p>
        {children}
      </div>
    </>
  );
}

function Panel({
  preference,
  retranslate,
}: {
  preference: LocalePreference;
  retranslate: boolean;
}) {
  const [state, setState] = useState<PanelState>({ kind: "idle" });
  const [lastDone, setLastDone] = useState<DoneState | null>(null);
  if (state.kind === "done" && state !== lastDone) setLastDone(state);

  useEffect(() => {
    const listener = (message: PanelMessage) => {
      if (message.type === "panel:state") setState(message.state);
    };
    chrome.runtime.onMessage.addListener(listener);
    keepPort();
    chrome.runtime.sendMessage({ type: "panel:hello" } satisfies PanelMessage).then(
      (current: PanelState | undefined) => {
        if (!current) return;
        setState(current);
        if (retranslate && current.kind === "done" && current.result.locale !== UI_LOCALE) {
          void send({ type: "panel:audit" });
        }
      },
      () => {},
    );
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      const open = port;
      port = null;
      open?.disconnect();
    };
  }, [retranslate]);

  const draw: Draw = (marks, focus, opts) => {
    keepPort();
    const reply = drawing.then(
      () =>
        send({
          type: "panel:highlight",
          marks,
          focus,
          scroll: opts.scroll ?? false,
          path: opts.path ?? false,
          timeoutMs: opts.timeoutMs ?? 0,
        }) as Promise<HighlightReply | undefined>,
    );
    drawing = reply.catch(() => undefined);
    return reply.then((r) => r ?? null);
  };

  const running = state.kind === "running";
  const walking = state.kind === "running" && state.task === "focus-path" ? state.stage : null;
  const shown = state.kind === "done" ? state : walking && lastDone ? lastDone : null;

  return (
    <Shell preference={preference}>
      <div role="status" aria-live="polite" className="sr-only">
        {running
          ? t("panel.announceStep", {
              n: (STAGE_AT[state.task][state.stage] ?? 0) + 1,
              stage: (state.task === "audit" ? AUDIT_STAGES : FOCUS_STAGES)[
                STAGE_AT[state.task][state.stage] ?? 0
              ],
            })
          : ""}
      </div>

      {state.kind === "idle" && (
        <Message title={t("panel.idleTitle")} body={t("panel.idleBody")}>
          <button
            type="button"
            onClick={() => void send({ type: "panel:audit" })}
            className={`${PRIMARY_BUTTON} mt-4`}
          >
            {t("panel.auditThisTab")}
          </button>
        </Message>
      )}

      {state.kind === "running" && !shown && (
        <Running url={state.url} task={state.task} stage={state.stage} />
      )}

      {state.kind === "unsupported" && (
        <Message title={t("panel.unsupportedTitle")} body={t(state.reason)} />
      )}

      {state.kind === "error" && (
        <Message title={t("panel.errorTitle")} body={state.message}>
          {state.recoverable && (
            <button
              type="button"
              onClick={() => void send({ type: "panel:audit" })}
              className={`${PRIMARY_BUTTON} mt-4`}
            >
              {t("panel.tryAgain")}
            </button>
          )}
        </Message>
      )}

      {shown && (
        <Report
          key={shown.result.scannedAt}
          result={shown.result}
          deepError={walking ? undefined : shown.deepError}
          walking={walking}
          onReaudit={() => void send({ type: "panel:audit" })}
          onWalk={() => void send({ type: "panel:focus-path" })}
          onContinue={() => void send({ type: "panel:continue-walk" })}
          draw={draw}
          restoreScroll={() => send({ type: "panel:restore-scroll" })}
        />
      )}
    </Shell>
  );
}

async function boot(): Promise<void> {
  const [preference, retranslate] = await Promise.all([readPreference(), takeLanguageChanged()]);

  UI_LOCALE = localeOf(preference);
  t = translator(UI_LOCALE);
  AUDIT_STAGES = [t("stage.structure"), t("stage.rules"), t("stage.report")];
  FOCUS_STAGES = [t("stage.focus"), t("stage.report")];
  document.documentElement.lang = UI_LOCALE;

  createRoot(document.getElementById("root")!).render(
    <Panel preference={preference} retranslate={retranslate} />,
  );
}

void boot();
