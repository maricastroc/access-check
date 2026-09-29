import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { FindingRow } from "../../src/components/ui/finding-row";
import { OccurrenceStepper } from "../../src/components/ui/occurrence-stepper";
import { SectionKicker } from "../../src/components/ui/section-kicker";
import { VerdictSeal } from "../../src/components/ui/verdict-seal";
import { StageList } from "../../src/components/ui/scan-stages";
import { WarningList } from "../../src/components/ui/warning-list";
import { workQueue, type FindingView, type QueueGroup } from "../../src/lib/report/findings";
import { describeElement } from "../../src/lib/report/identity";
import { reviewGuidance } from "../../src/lib/scan/review";
import { verdictMessage, verdictTone } from "../../src/lib/report/verdict";
import type { OverlayMark } from "../../src/lib/scan/dom/overlay";
import type { ScanResult } from "../../src/lib/scan/types";
import { langAttrs, REPORT_LOCALES } from "../../src/lib/i18n/locale";
import type { ReportLocale } from "../../src/lib/i18n/locale";
import { translator, type MessageKey } from "../../src/lib/i18n/t";
import { auditScope, focusPathLines, type AuditScope } from "./coverage";
import { locationsOf, type Location } from "./locations";
import {
  scoringIsCurrent,
  standingOf,
  STANDING_LABEL,
  STANDING_NOTE,
  STANDING_TONE,
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

function send(message: PanelMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message).catch(() => undefined);
}

function LanguageChoice({ preference }: { preference: LocalePreference }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-hairline px-3 pt-3">
      <label htmlFor="panel-language" className="shrink-0">
        <SectionKicker>{t("language.label")}</SectionKicker>
      </label>
      <select
        id="panel-language"
        value={preference}
        onChange={(e) => {
          const chosen = e.target.value as LocalePreference;
          void writePreference(chosen)
            .then(markLanguageChanged)
            .then(() => location.reload());
        }}
        className="ml-auto max-w-full min-w-0 cursor-pointer border border-border bg-surface px-2 py-1 text-[12.5px] text-ink"
      >
        <option value={FOLLOW_BROWSER}>{t("language.followBrowser")}</option>
        {REPORT_LOCALES.map((option) => (
          <option key={option} value={option} lang={option}>
            {NATIVE_NAME[option]}
          </option>
        ))}
      </select>
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
    <main className="min-h-screen bg-canvas pb-4 font-sans text-ink">
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
  title: string;
  standing?: Standing;
  onTop?: () => void;
  onReaudit?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border bg-canvas px-3 py-2">
      <h1 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{title}</h1>
      {onReaudit && (
        <button
          type="button"
          onClick={onReaudit}
          disabled={busy}
          className={`${SMALL_BUTTON} shrink-0 bg-surface py-1 text-[12px]`}
        >
          {t("panel.reaudit")}
        </button>
      )}
      {standing && onTop && (
        <button
          type="button"
          onClick={onTop}
          className="shrink-0 cursor-pointer border border-border bg-surface px-2 py-1 font-cond text-[12px] font-semibold hover:bg-band"
          style={{ color: STANDING_TONE[standing] }}
        >
          {t(STANDING_LABEL[standing])}
          <span className="sr-only">{t("panel.backToSummary")}</span>
        </button>
      )}
    </div>
  );
}

function Header({
  result,
  groups,
  walking,
  deepError,
  round,
  onWalk,
  onContinue,
  onShowKeyboard,
}: {
  result: ScanResult;
  groups: { group: QueueGroup; findings: FindingView[] }[];
  walking: AuditStage | null;
  deepError?: string;
  round: RoundOutcome | null;
  onWalk: () => void;
  onContinue: () => void;
  onShowKeyboard: (() => void) | null;
}) {
  const scope = auditScope(result, t);
  const standing = standingOf(result.counts);
  const inGroup = (group: QueueGroup) =>
    groups.find((g) => g.group === group)?.findings.length ?? 0;
  const toFix = inGroup("fix");
  const toCheck = inGroup("check");
  const work = [
    toFix > 0 ? t("panel.toFix", { count: toFix }) : null,
    toCheck > 0 ? t("panel.toCheck", { count: toCheck }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="mt-3 border border-border bg-surface p-3" aria-labelledby="verdict-heading">
      <SectionKicker as="h2" id="verdict-heading">
        {scope.kicker}
      </SectionKicker>
      <p
        className="mt-1 font-cond text-[30px] leading-[1.05]"
        style={{ color: STANDING_TONE[standing] }}
      >
        {t(STANDING_LABEL[standing])}
      </p>
      <p className="mt-0.5 text-[12.5px] leading-normal text-body">{t(STANDING_NOTE[standing])}</p>
      {work && <p className="mt-2 text-[13px] font-semibold text-ink tabular-nums">{work}</p>}

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
        <div className="mt-2.5 border border-dashed border-border bg-canvas px-2.5 py-2">
          <SectionKicker as="h3">{t("standing.staleTitle")}</SectionKicker>
          <p className="mt-1 text-[12.5px] leading-normal text-body">{t("standing.staleBody")}</p>
        </div>
      )}
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
      <div className="mt-3 border-t border-hairline pt-2.5">
        <p className="text-[12.5px] font-semibold text-ink">{t("panel.walkingFocusPath")}</p>
        <StageList stages={FOCUS_STAGES} current={STAGE_AT["focus-path"][walking] ?? 0} />
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-hairline pt-2.5">
      {outcome && (
        <div role="status" className="mb-2.5">
          <p className="text-[12.5px] leading-normal text-body">
            {t("panel.roundChecked", { count: outcome.checked })}{" "}
            {outcome.problems > 0
              ? t("panel.roundProblems", { count: outcome.problems })
              : t("panel.roundNoProblems")}
          </p>
          {onShowKeyboard && (
            <button type="button" onClick={onShowKeyboard} className={`${SMALL_BUTTON} mt-1.5`}>
              {t("panel.showKeyboardProblems")}
            </button>
          )}
        </div>
      )}
      {(pending || cut || started) && (
        <p className="text-[12.5px] leading-normal font-semibold text-moderate-text">
          {pending ? scope.lead : scope.badge}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-[12.5px] leading-normal text-critical">
          {error}
        </p>
      )}
      {pending && (
        <>
          <p id="walk-debugger-note" className="mt-1.5 text-[12px] leading-normal text-body">
            {t("panel.walkDebuggerNote")}
          </p>
          <button
            type="button"
            onClick={onWalk}
            aria-describedby="walk-debugger-note"
            className={`${SECONDARY_BUTTON} mt-2`}
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
            className={`${SECONDARY_BUTTON} mt-2`}
          >
            {t("panel.continueWalk")}
          </button>
          <p id="continue-walk-note" className="mt-1.5 text-[12px] leading-normal text-muted">
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
    <section className="mt-4" aria-labelledby="about-screenshot">
      <SectionKicker as="h3" id="about-screenshot">
        {t("panel.screenshot")}
      </SectionKicker>
      <p className="mt-0.5 text-[12px] text-muted">
        {marked > 0 ? t("panel.evidenceNoteMarked", { count: marked }) : t("panel.evidenceNote")}
      </p>
      <div className="relative mt-2 border border-hairline">
        {/* eslint-disable-next-line @next/next/no-img-element -- the panel is not a Next page */}
        <img
          src={result.screenshot}
          alt={t("panel.screenshotAlt", { url: result.finalUrl })}
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
    </section>
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
      {state === "done" ? t("panel.copied") : state === "failed" ? t("panel.copyFailed") : label}
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

function FindingDetail({
  finding,
  onLocate,
  previous,
  next,
}: {
  finding: FindingView;
  onLocate: (location: Location, n: number) => Promise<string | null>;
  previous: (() => void) | null;
  next: (() => void) | null;
}) {
  const locations = locationsOf(finding);
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = useRef(0);
  const total = locations.length;

  const at = Math.min(index, Math.max(total - 1, 0));
  const location = locations[at] ?? null;

  const show = async (place: Location) => {
    const ask = ++latest.current;
    setNotice(null);
    setBusy(true);
    const answer = await onLocate(place, place.stop ?? finding.n);
    if (ask !== latest.current) return;
    setNotice(answer);
    setBusy(false);
  };

  const step = (delta: number) => {
    const next = (at + delta + total) % total;
    setIndex(next);
    void show(locations[next]);
  };

  const locate = async () => {
    if (location) await show(location);
  };

  return (
    <>
      <Where
        finding={finding}
        location={location}
        at={at}
        total={total}
        busy={busy}
        notice={notice}
        onStep={step}
        onLocate={() => void locate()}
      />

      {finding.kind === "manual-review" ? (
        <HowToCheck ruleId={finding.ruleId} />
      ) : (
        <Field label={t("panel.whatToChange")}>
          <p className="text-[13px] leading-[1.55] break-words text-body">{finding.fixText}</p>
          {finding.fixCode && (
            <pre className="mt-1.5 overflow-x-auto bg-code p-2 font-mono text-[12px] text-ink">
              {finding.fixCode}
            </pre>
          )}
          {verdictTone(finding.verdict) === "quiet" ? (
            <p className="mt-1.5 text-[12px] leading-normal break-words text-muted">
              {verdictMessage(finding.verdict, t, finding.measurement)}
            </p>
          ) : (
            <div className="mt-2">
              <VerdictSeal verdict={finding.verdict} t={t} />
              <p className="mt-1.5 text-[12.5px] leading-normal break-words text-body">
                {verdictMessage(finding.verdict, t, finding.measurement)}
              </p>
            </div>
          )}
        </Field>
      )}

      <Field label={t("panel.why")}>
        <p className="text-[13px] leading-[1.55] break-words text-body">{finding.desc}</p>
        {finding.evidence === "heuristic" && finding.kind !== "manual-review" && (
          <div className="mt-2 border border-dashed border-border bg-canvas px-2.5 py-2">
            <SectionKicker as="div">{t("evidence.heuristic.title")}</SectionKicker>
            <p className="mt-1 text-[12.5px] leading-normal text-body">
              {t("evidence.heuristic.body")}
            </p>
          </div>
        )}
        {finding.contexts.length > 0 && (
          <p className="mt-1.5 text-[12px] text-muted">
            {t("panel.alsoFailsIn", { contexts: finding.contexts.join(", ") })}
          </p>
        )}
      </Field>

      {location && <ElementDetails location={location} />}

      {(previous || next) && (
        <nav
          aria-label={t("panel.problemNavigation")}
          className="mt-4 flex gap-1.5 border-t border-hairline pt-3"
        >
          <button
            type="button"
            className={`${SMALL_BUTTON} flex-1 py-1.5`}
            disabled={!previous}
            onClick={previous ?? undefined}
          >
            {t("panel.previousProblem")}
          </button>
          <button
            type="button"
            className={`${SMALL_BUTTON} flex-1 py-1.5`}
            disabled={!next}
            onClick={next ?? undefined}
          >
            {t("panel.nextProblem")}
          </button>
        </nav>
      )}
    </>
  );
}

function HowToCheck({ ruleId }: { ruleId: string }) {
  const guide = reviewGuidance(ruleId, t);

  return (
    <Field label={t("panel.howToCheck")}>
      <p className="text-[13px] leading-[1.55] break-words text-body">{guide.how}</p>
      <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[12.5px] leading-normal text-body">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </Field>
  );
}

function Where({
  finding,
  location,
  at,
  total,
  busy,
  notice,
  onStep,
  onLocate,
}: {
  finding: FindingView;
  location: Location | null;
  at: number;
  total: number;
  busy: boolean;
  notice: string | null;
  onStep: (delta: number) => void;
  onLocate: () => void;
}) {
  if (!location) {
    return (
      <Field label={t("panel.where")}>
        <p className="text-[13px] leading-[1.55] break-words text-body">
          {finding.noMarkerReason || t("marker.docLevel")}
        </p>
      </Field>
    );
  }

  const element = describeElement(location.selector, location.identity ?? undefined, t);
  const named = location.identity
    ? element.label
    : location.tag
      ? `<${location.tag}>`
      : location.selector;
  const context = location.identity ? element.context : location.label || null;
  const stop = location.keyboard
    ? location.stop === null
      ? t("panel.neverReached")
      : t("panel.stopN", { n: location.stop })
    : null;

  return (
    <section className="mt-3" aria-label={t("panel.where")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionKicker as="h4">{t("panel.where")}</SectionKicker>
        {total > 1 && (
          <OccurrenceStepper
            t={t}
            index={at}
            total={total}
            onPrev={() => onStep(-1)}
            onNext={() => onStep(1)}
          />
        )}
      </div>

      <p className="mt-1 font-mono text-[12.5px] leading-snug break-words text-ink">{named}</p>
      {(context || stop) && (
        <p className="text-[12px] break-words text-muted">
          {[stop, context].filter(Boolean).join(" · ")}
        </p>
      )}
      {location.reason && (
        <p className="mt-1.5 text-[13px] leading-[1.55] break-words text-body">{location.reason}</p>
      )}
      {location.keyboard && location.certainty === "needs-review" && (
        <p className="mt-1.5 text-[12px] leading-normal text-moderate-text">
          {t("panel.geometryUnsure")}
        </p>
      )}

      <button
        type="button"
        className={`${PRIMARY_BUTTON} mt-2.5`}
        disabled={busy}
        onClick={onLocate}
      >
        {busy ? t("panel.locating") : t("panel.locate")}
      </button>

      {notice && (
        <p role="status" className="mt-2 text-[12.5px] leading-normal text-moderate-text">
          {notice}
        </p>
      )}
    </section>
  );
}

function ElementDetails({ location }: { location: Location }) {
  const truncated = location.html?.includes("…") ?? false;

  return (
    <details className="mt-3 border-t border-hairline pt-2.5">
      <summary className="cursor-pointer">
        <SectionKicker as="h4" className="inline">
          {t("panel.details")}
        </SectionKicker>
      </summary>

      <Field label={t("panel.selector")}>
        <p className="overflow-x-auto font-mono text-[12px] break-all text-steel">
          {location.selector}
        </p>
      </Field>

      {location.html && (
        <Field label={t("panel.html")}>
          <pre className="max-h-40 overflow-auto bg-code p-2 font-mono text-[12px] break-all whitespace-pre-wrap text-ink">
            {location.html}
          </pre>
          {truncated && (
            <p className="mt-1.5 text-[12px] leading-normal text-muted">{t("panel.abbreviated")}</p>
          )}
        </Field>
      )}

      {location.measured && (
        <Field label={t("panel.measured")}>
          <p className="text-[12px] leading-normal break-words text-muted">{location.measured}</p>
        </Field>
      )}

      {location.rect && (
        <Field label={t("panel.position")}>
          <p className="text-[12px] text-muted tabular-nums">
            {t("panel.positionValue", {
              w: Math.round(location.rect.w),
              h: Math.round(location.rect.h),
              x: Math.round(location.rect.x),
              y: Math.round(location.rect.y),
            })}
            {location.onScreen ? "" : t("panel.offViewport")}
          </p>
        </Field>
      )}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <CopyButton label={t("panel.copySelector")} value={location.selector} />
        {location.html && <CopyButton label={t("panel.copyHtml")} value={location.html} />}
      </div>
    </details>
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
    <div className="mt-2 border border-moderate bg-surface px-3 py-2.5">
      <p lang={UI_LOCALE} className="text-[12.5px] leading-normal text-body">
        {t("panel.readingLanguage", { language: NATIVE_NAME[locale] })}
      </p>
      <button type="button" onClick={onReaudit} className={`${SMALL_BUTTON} mt-2`}>
        {t("panel.auditAgain")}
      </button>
    </div>
  );
}

const GROUP_TITLE: Record<QueueGroup, MessageKey> = {
  fix: "panel.group.fix",
  check: "panel.group.check",
  recommend: "panel.group.recommend",
};

function Findings({
  groups,
  locale,
  selected,
  setSelected,
  open,
  onLocate,
}: {
  groups: { group: QueueGroup; findings: FindingView[] }[];
  locale: ReportLocale | undefined;
  selected: string | null;
  setSelected: (id: string | null) => void;
  open: (id: string) => void;
  onLocate: (location: Location, n: number) => Promise<string | null>;
}) {
  const rows = (findings: FindingView[]) =>
    findings.map((f, i) => (
      <div
        key={f.id}
        id={`finding-${f.id}`}
        className="scroll-mt-12"
        {...langAttrs(locale, UI_LOCALE)}
      >
        <FindingRow
          t={t}
          finding={f}
          selected={selected === f.id}
          onSelect={() => setSelected(selected === f.id ? null : f.id)}
          markerNote={false}
        />
        {selected === f.id && (
          <div className="border-x border-b border-hairline bg-surface px-3 pt-1 pb-3">
            <FindingDetail
              finding={f}
              onLocate={onLocate}
              previous={i > 0 ? () => open(findings[i - 1].id) : null}
              next={i < findings.length - 1 ? () => open(findings[i + 1].id) : null}
            />
          </div>
        )}
      </div>
    ));

  return (
    <div className="mt-3 border border-border bg-surface">
      {groups.map(({ group, findings }) => {
        const heading = (
          <SectionKicker
            as="h2"
            id={`group-${group}`}
            className={group === "fix" ? undefined : "inline"}
          >
            {t(GROUP_TITLE[group])} · {findings.length}
          </SectionKicker>
        );

        if (group === "fix") {
          return (
            <section key={group} aria-labelledby={`group-${group}`}>
              <div className="border-b border-border px-3 py-2">{heading}</div>
              {findings.length === 0 ? (
                <p className="px-3 py-3 text-[12.5px] text-muted">{t("panel.noFailures")}</p>
              ) : (
                rows(findings)
              )}
            </section>
          );
        }

        if (findings.length === 0) return null;
        return (
          <details key={group} className="border-t border-border">
            <summary className="cursor-pointer px-3 py-2">{heading}</summary>
            {rows(findings)}
          </details>
        );
      })}
    </div>
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
    <section className="mt-4" aria-labelledby="about-checks">
      <SectionKicker as="h3" id="about-checks">
        {t("panel.checksPerformed")} · {ran.length}
      </SectionKicker>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12.5px] leading-[1.5] text-body">
        {ran.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
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

  return keyboard.focusPath.map((s) => {
    const unclear = s.focusIndicator === "shared";
    return {
      n: s.n,
      selector: s.selector,
      kind: !s.focusVisible ? "failure" : jumped.has(s.n) || unclear ? "attention" : "stop",
      label: !s.focusVisible
        ? t("panel.mark.noFocusRing")
        : unclear
          ? t("panel.mark.checkFocus")
          : jumped.has(s.n)
            ? t("panel.mark.checkOrder")
            : (s.label || t("panel.mark.stop")).slice(0, 28),
    };
  });
}

const NEIGHBOURS = 2;

function windowAround(marks: OverlayMark[], at: number): OverlayMark[] {
  return marks
    .filter((m) => Math.abs(m.n - at) <= NEIGHBOURS)
    .map((m) => (m.n === at ? m : { ...m, kind: "stop" as const }));
}

function FocusPath({
  result,
  notice,
  showing,
  at,
  complete,
  onShow,
  onStep,
  onToggleComplete,
  onExit,
}: {
  result: ScanResult;
  notice: string | null;
  showing: boolean;
  at: number;
  complete: boolean;
  onShow: () => void;
  onStep: (delta: number) => void;
  onToggleComplete: () => void;
  onExit: () => void;
}) {
  const walked = result.keyboard;
  if (!walked) return null;
  const stops = walked.focusPath.length;
  const lines = focusPathLines(walked, t);

  return (
    <section className="mt-3 border-t border-hairline px-3 pt-3" aria-labelledby="focus-heading">
      <SectionKicker as="h2" id="focus-heading">
        {t("panel.focusPath")}
      </SectionKicker>

      <p className="mt-1.5 text-[12.5px] leading-normal text-body">{lines.line}</p>

      {lines.notes.map((note) => (
        <p key={note} className="mt-1.5 text-[12px] leading-normal text-moderate-text">
          {note}
        </p>
      ))}

      {stops > 0 &&
        (!showing ? (
          <button type="button" onClick={onShow} className={`${SMALL_BUTTON} mt-2.5`}>
            {t("panel.showFocusPath")}
          </button>
        ) : (
          <div className="mt-2.5 border border-border bg-canvas p-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={t("panel.previousStop")}
                className={`${SMALL_BUTTON} flex-1`}
                onClick={() => onStep(-1)}
              >
                {t("panel.previous")}
              </button>
              <span
                aria-live="polite"
                className="min-w-24 text-center font-cond text-[13px] font-semibold text-ink tabular-nums"
              >
                {t("panel.stopOf", { at, total: stops })}
              </span>
              <button
                type="button"
                aria-label={t("panel.nextStop")}
                className={`${SMALL_BUTTON} flex-1`}
                onClick={() => onStep(1)}
              >
                {t("panel.next")}
              </button>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button type="button" className={SMALL_BUTTON} onClick={onToggleComplete}>
                {complete ? t("panel.showNearbyOnly") : t("panel.showComplete")}
              </button>
              <button type="button" className={`${SMALL_BUTTON} ml-auto`} onClick={onExit}>
                {t("panel.exitInspection")}
              </button>
            </div>

            <p className="mt-1.5 text-[11.5px] leading-normal text-muted">
              {complete
                ? t("panel.drawingAll")
                : t("panel.drawingWindow", { neighbours: NEIGHBOURS })}
            </p>
          </div>
        ))}

      {notice && <p className="mt-2 text-[12px] leading-normal text-moderate-text">{notice}</p>}
    </section>
  );
}

function Running({ url, task, stage }: { url: string; task: AuditTask; stage: AuditStage }) {
  const stages = task === "audit" ? AUDIT_STAGES : FOCUS_STAGES;
  const current = STAGE_AT[task][stage] ?? 0;

  return (
    <>
      <StickyBar title={task === "audit" ? t("panel.auditingTab") : t("panel.walkingFocusPath")} />
      <div className="px-3 pt-3">
        <p className="truncate font-mono text-[12px] text-muted">{url}</p>
        <div className="mt-3 border border-border bg-surface p-3">
          <StageList stages={stages} current={current} />
        </div>
        <p className="mt-3 text-[12.5px] leading-[1.5] text-muted">
          {task === "audit" ? t("panel.runningNote") : t("panel.runningNoteFocus")}
        </p>
      </div>
    </>
  );
}

function Report({
  result,
  deepError,
  walking,
  onReaudit,
  onWalk,
  onContinue,
  draw,
  clear,
  restoreScroll,
}: {
  result: ScanResult;
  deepError?: string;
  walking: AuditStage | null;
  onReaudit: () => void;
  onWalk: () => void;
  onContinue: () => void;
  draw: (
    marks: OverlayMark[],
    focus: number | null,
    timeoutMs: number,
  ) => Promise<{ notice: string | null }>;
  clear: () => void;
  restoreScroll: () => Promise<unknown>;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [at, setAt] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [roundFrom, setRoundFrom] = useState<number | null>(null);
  const [wasWalking, setWasWalking] = useState(walking !== null);
  const marks = marksFor(result);
  const scope = auditScope(result, t);
  const groups = workQueue(result);
  const stops = result.keyboard?.focusPath.length ?? 0;

  if ((walking !== null) !== wasWalking) {
    setWasWalking(walking !== null);
    if (walking !== null) setRoundFrom(stops);
  }

  const keyboardProblems = groups.flatMap((g) => g.findings).filter((f) => f.kind === "keyboard");
  const round =
    roundFrom !== null && walking === null
      ? { checked: Math.max(0, stops - roundFrom), problems: keyboardProblems.length }
      : null;

  const open = (id: string) => {
    setSelected(id);
    requestAnimationFrame(() => {
      const row = document.getElementById(`finding-${id}`);
      const group = row?.closest("details");
      if (group) group.open = true;
      row?.scrollIntoView({ block: "start" });
      row?.querySelector("button")?.focus({ preventScroll: true });
    });
  };

  const locate = async (location: Location, n: number) => {
    setShowing(false);
    setNotice(null);
    const mark: OverlayMark = {
      n,
      selector: location.selector,
      kind: location.certainty === "conclusive" ? "failure" : "attention",
      label: location.label || undefined,
    };
    const done = await draw([mark], mark.n, 6000);
    return done.notice;
  };

  const showPath = async (focus: number, everything = complete) => {
    const next = Math.min(Math.max(focus, 1), marks.length);
    setAt(next);
    setShowing(true);
    const done = await draw(everything ? marks : windowAround(marks, next), next, 0);
    setNotice(done.notice);
  };

  return (
    <>
      <StickyBar
        title={result.title}
        standing={standingOf(result.counts)}
        onTop={() => window.scrollTo({ top: 0, behavior: "instant" })}
        onReaudit={onReaudit}
        busy={walking !== null}
      />
      <div className="px-3">
        <p className="mt-2 truncate font-mono text-[12px] text-muted">{result.finalUrl}</p>
        <ReadingLanguage locale={result.locale} onReaudit={onReaudit} />
        <Header
          result={result}
          groups={groups}
          walking={walking}
          deepError={deepError}
          round={round}
          onWalk={onWalk}
          onContinue={onContinue}
          onShowKeyboard={keyboardProblems.length > 0 ? () => open(keyboardProblems[0].id) : null}
        />
        <Findings
          groups={groups}
          locale={result.locale}
          selected={selected}
          setSelected={setSelected}
          open={open}
          onLocate={locate}
        />
        <FocusPath
          result={result}
          notice={notice}
          showing={showing}
          at={at}
          complete={complete}
          onShow={() => void showPath(at)}
          onStep={(delta) => void showPath(((at - 1 + delta + marks.length) % marks.length) + 1)}
          onToggleComplete={() => {
            const next = !complete;
            setComplete(next);
            void showPath(at, next);
          }}
          onExit={() => {
            setShowing(false);
            setNotice(null);
            void restoreScroll().then(clear);
          }}
        />
      </div>

      <Collapsed title={t("panel.aboutAudit")} note={scope.summary}>
        <section aria-labelledby="about-coverage">
          <SectionKicker as="h3" id="about-coverage">
            {t("panel.coverageLimitations")}
          </SectionKicker>
          <p className="mt-1 text-[13px] leading-[1.55] text-body">{scope.note}</p>
          <div className="mt-2.5">
            <WarningList
              warnings={result.warnings ?? []}
              title={t("panel.notChecked")}
              note={t("panel.notCheckedNote")}
            />
          </div>
        </section>
        <ChecksPerformed result={result} />
        <Capture result={result} />
      </Collapsed>
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
      port.current?.disconnect();
    };
  }, [retranslate]);

  const draw = async (
    marks: OverlayMark[],
    focus: number | null,
    timeoutMs: number,
  ): Promise<{ notice: string | null }> => {
    keepPort();
    const reply = (await send({
      type: "panel:highlight",
      marks,
      focus,
      scroll: focus !== null,
      timeoutMs,
    })) as HighlightReply | undefined;

    if (!reply) return { notice: t("panel.pageUnreachable") };
    if (!reply.ok) return { notice: reply.message };

    const { missing, offScreen, focused } = reply.report;
    const notice = !focused
      ? null
      : !focused.found
        ? t("panel.elementGone")
        : missing.length > 0
          ? t("panel.someStopsGone", {
              missing: missing.length,
              total: missing.length + reply.report.drawn,
            })
          : offScreen.length > 0 && marks.length > 1
            ? t("panel.someStopsOffScreen", {
                offScreen: offScreen.length,
                total: marks.length,
              })
            : null;

    return { notice };
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
        <Message kicker="AccessCheck" title={t("panel.idleTitle")} body={t("panel.idleBody")} />
      )}

      {state.kind === "running" && !shown && (
        <Running url={state.url} task={state.task} stage={state.stage} />
      )}

      {state.kind === "unsupported" && (
        <Message
          kicker={t("panel.unsupportedKicker")}
          title={t("panel.unsupportedTitle")}
          body={t(state.reason)}
        />
      )}

      {state.kind === "error" && (
        <Message kicker={t("panel.errorKicker")} title={t("panel.errorTitle")} body={state.message}>
          {state.recoverable && (
            <button
              type="button"
              onClick={() => void send({ type: "panel:audit" })}
              className={`${PRIMARY_BUTTON} mt-3`}
            >
              {t("panel.tryAgain")}
            </button>
          )}
        </Message>
      )}

      {shown && (
        <Report
          result={shown.result}
          deepError={walking ? undefined : shown.deepError}
          walking={walking}
          onReaudit={() => void send({ type: "panel:audit" })}
          onWalk={() => void send({ type: "panel:focus-path" })}
          onContinue={() => void send({ type: "panel:continue-walk" })}
          draw={draw}
          clear={() => void send({ type: "panel:clear-highlight" })}
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
