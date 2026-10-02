import type { ReactNode } from "react";
import type { FindingView } from "@/lib/report/findings";
import type { Occurrence } from "@/lib/report/occurrences";
import { unlistedOccurrences } from "@/lib/report/occurrences";
import { chainOf, type Chain, type ContrastReading, type StationKind } from "@/lib/report/chain";
import { describeElement } from "@/lib/report/identity";
import { verdictMessage } from "@/lib/report/verdict";
import { SC_LEVEL } from "@/lib/report/wcag";
import { reviewGuidance } from "@/lib/scan/review";
import { translator, type MessageKey, type Translate } from "@/lib/i18n/t";
import { REPORT_LOCALES } from "@/lib/i18n/locale";
import { cn } from "@/lib/cn";
import { CodeChange, Heard, NodeGlyph, RatioGauge, TextSample, sevOf, type Sev } from "./notation";
import { OccurrenceNav } from "./occurrence-nav";
import { ElementDetails } from "./element-details";

const ROLE_KEY: Record<string, MessageKey> = {
  button: "chain.role.button",
  link: "chain.role.link",
  field: "chain.role.field",
  image: "chain.role.image",
};

function Station({
  label,
  meta,
  glyph,
  segment,
  anchor,
  last,
  compact,
  children,
}: {
  label: string;
  meta?: string | null;
  glyph: ReactNode;
  segment: "solid" | "dashed";
  anchor?: string;
  last: boolean;
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <li className={cn("relative pl-11", last ? "pb-1" : compact ? "pb-6" : "pb-7")}>
      {!last && (
        <span
          aria-hidden
          className={cn(
            "absolute top-[22px] bottom-0 left-[14px] border-l-2 border-ink",
            segment === "dashed" && "border-dashed",
          )}
        />
      )}
      <span
        data-anchor={anchor}
        className="absolute top-0 left-[4px] flex size-[22px] items-center justify-center"
      >
        {glyph}
      </span>
      <h4 className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13.5px] leading-[22px]">
        <span className="font-semibold text-ink-2">{label}</span>
        {meta && <span className="text-[12.5px] font-normal text-muted">{meta}</span>}
      </h4>
      <div className="mt-2">{children}</div>
    </li>
  );
}

function quotedName(occ: Occurrence | null): string | null {
  return occ?.identity?.name ?? occ?.name ?? null;
}

function Located({
  finding,
  occurrences,
  index,
  onPick,
  extra,
  t,
}: {
  finding: FindingView;
  occurrences: Occurrence[];
  index: number;
  onPick: (index: number) => void;
  extra?: ReactNode;
  t: Translate;
}) {
  const occ = occurrences[index] ?? null;
  if (!occ) {
    return (
      <>
        <p className="text-[14.5px] leading-normal break-words text-ink-2">
          {finding.noMarkerReason || t("marker.docLevel")}
        </p>
        {extra}
      </>
    );
  }

  const view = describeElement(occ.selector, occ.identity ?? undefined, t);
  const name = quotedName(occ);
  const identity = occ.identity;
  const element = identity
    ? [
        `${identity.tag}${identity.ref ?? ""}`,
        identity.of !== null && identity.of > 1 && identity.nth !== null
          ? t("identity.nth", { n: identity.nth, total: identity.of })
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    : view.label;
  const stop = occ.keyboard
    ? occ.stop !== null
      ? t("panel.stopN", { n: occ.stop })
      : t("panel.neverReached")
    : null;
  const code = [stop, element, view.context].filter(Boolean).join(" · ");
  const unlisted = unlistedOccurrences(finding, occurrences.length);

  return (
    <>
      {name && <p className="text-[15.5px] leading-snug break-words text-ink">“{name}”</p>}
      <p
        className={cn(
          "font-mono break-words",
          name ? "mt-1 text-[13px] text-muted" : "text-[14.5px] text-ink",
        )}
      >
        {code}
      </p>
      {occ.reason && occ.keyboard && finding.ruleId !== "focus-not-visible" && (
        <p className="mt-1.5 text-[14.5px] leading-normal break-words text-ink-2">{occ.reason}</p>
      )}
      {occ.keyboard && occ.certainty === "needs-review" && (
        <p className="mt-1.5 text-[13px] leading-normal text-review">{t("panel.geometryUnsure")}</p>
      )}
      <OccurrenceNav
        n={finding.n}
        index={index}
        sev={sevOf(finding)}
        onPick={onPick}
        t={t}
        labels={occurrences.map(
          (o) => describeElement(o.selector, o.identity ?? undefined, t).label,
        )}
      />
      {unlisted > 0 && occurrences.length > 0 && (
        <p className="mt-2 text-[13px] text-muted">{t("chain.unlisted", { count: unlisted })}</p>
      )}
      {extra}
    </>
  );
}

function Contrast({
  reading,
  text,
  sev,
  t,
}: {
  reading: ContrastReading;
  text: string;
  sev: Sev;
  t: Translate;
}) {
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span
          className="font-mono text-[30px] leading-none font-semibold tracking-[-0.02em] text-(--sev)"
          data-sev={sev}
        >
          {reading.measured.toFixed(2)}:1
        </span>
        <span className="text-[15px] text-ink-2">
          {reading.required}:1 {t("chain.needed")}
          {reading.required <= 3 && t("detail.largeText")}
        </span>
      </p>
      <div className="mt-3">
        <RatioGauge
          measured={reading.measured}
          required={reading.required}
          sev={sev}
          neededLabel={t("chain.needed")}
        />
      </div>
      {reading.fromHex && reading.bgHex && (
        <div className="mt-3">
          <TextSample
            fg={reading.fromHex}
            bg={reading.bgHex}
            text={text}
            caption={t("chain.onThePage")}
            ratio={reading.measured}
            tone="measured"
            showRatio={false}
          />
        </div>
      )}
    </div>
  );
}

function Evidence({
  finding: f,
  chain,
  occ,
  figure,
  t,
}: {
  finding: FindingView;
  chain: Chain;
  occ: Occurrence | null;
  figure?: ReactNode;
  t: Translate;
}) {
  const sev = sevOf(f);
  const evidence = chain.evidence;
  const notes = (
    <>
      {f.evidence === "heuristic" && f.kind !== "manual-review" && (
        <div className="mt-3 border-l-2 border-dashed border-review pl-3">
          <p className="text-[13.5px] font-semibold text-ink-2">{t("evidence.heuristic.title")}</p>
          <p className="mt-0.5 text-[13.5px] leading-normal text-ink-2">
            {t("evidence.heuristic.body")}
          </p>
        </div>
      )}
      {f.kind === "best-practice" && (
        <p className="mt-2 text-[13.5px] leading-normal text-muted">{t("verdict.bestPractice")}</p>
      )}
      {f.contexts.length > 0 && (
        <p className="mt-2 text-[13px] text-muted">
          {t("panel.alsoFailsIn", { contexts: f.contexts.join(", ") })}
        </p>
      )}
    </>
  );

  if (evidence.kind === "contrast") {
    return (
      <>
        <Contrast
          reading={evidence.reading}
          text={quotedName(occ) ?? t("detail.sampleText")}
          sev={sev}
          t={t}
        />
        {notes}
      </>
    );
  }

  if (evidence.kind === "unnamed") {
    return (
      <>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          {figure}
          <Heard
            role={t(ROLE_KEY[evidence.role])}
            name={null}
            sev={sev}
            label={t("chain.heardAs")}
            missing={t("chain.noName")}
          />
        </div>
        {notes}
      </>
    );
  }

  if (evidence.kind === "focus") {
    return (
      <>
        {figure}
        {occ?.reason && (
          <p
            className={cn(
              "text-[15px] leading-normal break-words text-ink-2",
              Boolean(figure) && "mt-2.5",
            )}
          >
            {occ.reason}
          </p>
        )}
        {notes}
      </>
    );
  }

  return (
    <>
      <p className="text-[15px] leading-normal break-words text-ink-2">{f.desc}</p>
      {notes}
    </>
  );
}

const PLACEHOLDERS = new Set(
  REPORT_LOCALES.map((locale) => translator(locale)("fix.describeControl")),
);

function suggestedName(code: string | null): string | null {
  const name = code?.match(/(?:aria-label|alt)="([^"]+)"/)?.[1] ?? null;
  return name && !PLACEHOLDERS.has(name) ? name : null;
}

function Change({
  finding: f,
  chain,
  occ,
  t,
}: {
  finding: FindingView;
  chain: Chain;
  occ: Occurrence | null;
  t: Translate;
}) {
  const evidence = chain.evidence;

  if (evidence.kind === "contrast" && evidence.reading.toHex && evidence.reading.prop) {
    const r = evidence.reading;
    const before = r.prop === "color" ? r.fromHex : r.bgHex;
    const fg = r.prop === "color" ? r.toHex! : r.fromHex;
    const bg = r.prop === "background" ? r.toHex! : r.bgHex;
    return (
      <div className="space-y-3">
        <CodeChange
          removed={before ? `${r.prop}: ${before};` : null}
          added={`${r.prop}: ${r.toHex};`}
        />
        {fg && bg && r.fixed != null && (
          <TextSample
            fg={fg}
            bg={bg}
            text={quotedName(occ) ?? t("detail.sampleText")}
            caption={t("chain.withChange")}
            ratio={r.fixed}
            tone="tested"
          />
        )}
      </div>
    );
  }

  const action = f.guidance?.action ?? f.fixText;
  const code = f.fixCode ?? f.guidance?.example?.code ?? null;
  const named = evidence.kind === "unnamed" ? suggestedName(f.fixCode) : null;

  return (
    <div className="space-y-3">
      {action && <p className="text-[15px] leading-normal break-words text-ink">{action}</p>}
      {code && <CodeChange added={code} />}
      {named && evidence.kind === "unnamed" && (
        <Heard
          role={t(ROLE_KEY[evidence.role])}
          name={named}
          sev={sevOf(f)}
          label={t("chain.withChange")}
          missing=""
        />
      )}
      {f.guidance?.caution && (
        <p className="text-[13.5px] leading-normal text-muted">{f.guidance.caution}</p>
      )}
      {f.guidance?.humanDecision && (
        <p className="text-[13.5px] leading-normal text-muted">{t("detail.humanDecision")}</p>
      )}
    </div>
  );
}

function Decide({ finding: f, t }: { finding: FindingView; t: Translate }) {
  const guide = reviewGuidance(f.ruleId, t);
  return (
    <>
      <p className="text-[13.5px] font-semibold text-ink-2">{t("panel.howToCheck")}</p>
      <p className="mt-1 text-[15px] leading-normal break-words text-ink">{guide.how}</p>
      <ol className="mt-2.5 list-decimal space-y-1.5 pl-5 text-[14.5px] leading-normal text-ink-2 marker:text-muted">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </>
  );
}

function Verdict({
  finding: f,
  chain,
  host,
  testedOn,
  t,
}: {
  finding: FindingView;
  chain: Chain;
  host: string;
  testedOn: "copy" | "page";
  t: Translate;
}) {
  const reading = chain.evidence.kind === "contrast" ? chain.evidence.reading : null;
  const message = verdictMessage(f.verdict, t, f.measurement);

  if (chain.end === "tested" || chain.end === "failed") {
    return (
      <div>
        {chain.end === "tested" && reading?.fixed != null && (
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-[22px] leading-none font-semibold text-verified">
              {reading.fixed.toFixed(2)}:1
            </span>
            <span className="text-[15px] text-ink-2">
              {t("chain.passes", { required: reading.required })}
            </span>
          </p>
        )}
        <p className="mt-1 text-[14.5px] leading-normal text-ink-2">
          {chain.end === "tested" && reading && reading.verification !== "verified"
            ? t("chain.notRemeasured")
            : chain.end === "tested"
              ? t(testedOn === "page" ? "chain.testedOnPage" : "chain.testedOnCopy")
              : message}
        </p>
        <details className="mt-2.5">
          <summary className="flex w-fit cursor-pointer items-center gap-1.5 text-[13.5px] font-semibold text-ink-2">
            <span aria-hidden className="ac-chev" />
            {t("chain.howVerified")}
          </summary>
          <p className="mt-2 text-[14px] leading-normal text-ink-2">{message}</p>
          <p className="mt-1.5 text-[13px] leading-normal text-muted">
            {testedOn === "page" ? t("detail.pageNote") : t("detail.sandboxNote", { host })}
          </p>
        </details>
      </div>
    );
  }

  return <p className="text-[15px] leading-normal text-ink-2">{message}</p>;
}

const END_KEY: Record<NonNullable<Chain["end"]>, MessageKey> = {
  tested: "chain.end.tested",
  failed: "chain.end.failed",
  person: "chain.end.person",
  recheck: "chain.end.recheck",
  untested: "chain.end.untested",
};

export function EvidenceChain({
  finding,
  occurrences,
  index,
  onPick,
  host,
  testedOn = "copy",
  t,
  compact = false,
  located,
  figure,
  footer,
}: {
  finding: FindingView;
  occurrences: Occurrence[];
  index: number;
  onPick: (index: number) => void;
  host: string;
  testedOn?: "copy" | "page";
  t: Translate;
  compact?: boolean;
  located?: ReactNode;
  figure?: ReactNode;
  footer?: ReactNode;
}) {
  const occ = occurrences[index] ?? null;
  const chain = chainOf(finding, occ);
  const sev = sevOf(finding);
  const level = finding.criterionSc ? SC_LEVEL[finding.criterionSc] : null;
  const criterion = finding.criterionSc
    ? `WCAG ${[finding.criterionSc, level].filter(Boolean).join(" ")}`
    : null;
  const segment = (kind: StationKind): "solid" | "dashed" => {
    if (!chain.measured) return "dashed";
    const next = chain.stations[chain.stations.indexOf(kind) + 1];
    if (next === "verdict") return chain.closed ? "solid" : "dashed";
    return "solid";
  };

  const body: Record<StationKind, { label: string; glyph: ReactNode; content: ReactNode }> = {
    located: {
      label: t("chain.located"),
      glyph: <NodeGlyph kind="located" sev={sev} />,
      content: (
        <Located
          finding={finding}
          occurrences={occurrences}
          index={index}
          onPick={onPick}
          extra={located}
          t={t}
        />
      ),
    },
    evidence: {
      label:
        chain.measured && chain.evidence.kind !== "note"
          ? t("chain.measured")
          : t("chain.evidence"),
      glyph: <NodeGlyph kind="evidence" sev={chain.measured ? sev : "review"} />,
      content: <Evidence finding={finding} chain={chain} occ={occ} figure={figure} t={t} />,
    },
    change: {
      label: t("chain.change"),
      glyph: <NodeGlyph kind="change" sev={sev} />,
      content: <Change finding={finding} chain={chain} occ={occ} t={t} />,
    },
    decide: {
      label: t("chain.decide"),
      glyph: <NodeGlyph kind="end" sev={sev} end="person" />,
      content: <Decide finding={finding} t={t} />,
    },
    verdict: {
      label: chain.end
        ? t(
            chain.end === "person" && finding.kind !== "manual-review"
              ? "chain.end.fixPerson"
              : END_KEY[chain.end],
          )
        : "",
      glyph: <NodeGlyph kind="end" sev={sev} end={chain.end} />,
      content: <Verdict finding={finding} chain={chain} host={host} testedOn={testedOn} t={t} />,
    },
  };

  return (
    <section
      id={`investigation-${finding.id}`}
      aria-label={t("chain.investigation", { n: finding.n })}
      data-chain-end={chain.end ?? "none"}
      className={cn("ac-rise pb-5", compact ? "px-3" : "px-6")}
    >
      <ol className="relative">
        {chain.stations.map((kind, i) => (
          <Station
            key={kind}
            label={body[kind].label}
            meta={kind === "evidence" ? criterion : null}
            glyph={body[kind].glyph}
            segment={segment(kind)}
            anchor={kind === "located" ? "station-located" : undefined}
            last={i === chain.stations.length - 1}
            compact={compact}
          >
            {body[kind].content}
          </Station>
        ))}
      </ol>
      <ElementDetails finding={finding} occ={occ} t={t} />
      {footer}
    </section>
  );
}
