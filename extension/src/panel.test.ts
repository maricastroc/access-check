import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  auditScope,
  crossOriginWarning,
  focusPathLines,
  warningsAfterDeepAudit,
  warningsAfterPriming,
} from "./coverage";
import { unsupportedReason } from "./state";
import { translator } from "../../src/lib/i18n/t";
import type { KeyboardReport } from "../../src/lib/scan/keyboard";
import type { ScanResult, ScanWarning } from "../../src/lib/scan/types";

const file = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

function between(source: string, from: string, to: string): string {
  const start = source.indexOf(from);
  const end = source.indexOf(to);
  if (start === -1) throw new Error(`Anchor not found in source: ${from}`);
  if (end === -1) throw new Error(`Anchor not found in source: ${to}`);
  if (end < start) throw new Error(`Anchor ${to} comes before ${from}`);
  return source.slice(start, end);
}

const t = translator();
const pt = translator("pt-BR");

const panel = file("./panel.tsx");
const overlay = file("../../src/lib/scan/dom/overlay.ts");
const shared = (name: string) => file(`../../src/components/investigation/${name}`);
const summary = shared("summary.tsx");
const list = shared("finding-list.tsx");
const chain = shared("evidence-chain.tsx");
const details = shared("element-details.tsx");
const nav = shared("problem-nav.tsx");
const sequence = shared("focus-sequence.tsx");
const occurrences = shared("occurrence-nav.tsx");
const investigation = shared("use-investigation.ts");
const audit = file("./audit.ts");
const background = file("./background.ts");
const preference = file("./locale-preference.ts");
const manifest = JSON.parse(file("../manifest.json")) as {
  permissions: string[];
  host_permissions?: string[];
};

describe("the panel reuses the product's own report", () => {
  it("renders the shared findings list, not a second one", () => {
    expect(panel).toContain('from "../../src/lib/report/findings"');
    expect(panel).toContain("workQueue(result)");
    expect(panel).not.toContain("buildFindings(");
  });

  it("draws the investigation with the same components as the site", () => {
    expect(panel).toContain('from "../../src/components/investigation"');
    for (const shared of [
      "<Summary",
      "<FindingList",
      "<EvidenceChain",
      "<ProblemNav",
      "<FocusSequence",
    ]) {
      expect(panel, shared).toContain(shared);
    }
    expect(panel).toContain('from "../../src/components/ui/warning-list"');
    expect(panel).not.toMatch(
      /function (FindingDetail|Where|ElementDetails|CopyButton|HowToCheck|Findings)\(/,
    );
    expect(panel).not.toContain("locationsOf");
  });

  it("has no second implementation of the counts or the summary", () => {
    expect(summary).toContain("groups.find((x) => x.group === g)?.findings");
    expect(panel).not.toMatch(/violations\.filter\(/);
    expect(panel).not.toContain("computeScore");
    expect(panel).not.toContain("buildSummary");
  });

  it("takes fixes and their confidence from the shared enrichment", () => {
    expect(audit).toContain("enrichViolations(wcagViolations, elementInfos, t)");
    expect(audit).toContain("attachFixGroups(enriched)");
    expect(manifest.permissions).not.toContain("<all_urls>");
  });

  it("verifies fixes through the shared engine, never its own copy", () => {
    expect(audit).toContain("planVerification(enriched, MAX_VERIFY_OPS)");
    expect(audit).toContain("dom.verifyFixes(ops)");
    expect(audit).not.toContain("axe.run(");
    expect(audit).not.toContain("setAttribute");
    expect(audit).not.toContain("removeAttribute");
  });

  it("needs no debugger to verify a fix, so the plain audit can do it", () => {
    const run = between(background, "async function runAudit(", "async function addFocusPath(");
    expect(run).not.toContain("chrome.debugger");
    expect(audit).not.toContain("chrome.debugger");
  });

  it("no longer says fixes went untested", () => {
    const coverage = file("./coverage.ts");
    const unavailable = between(
      coverage,
      "export function unavailableWarnings",
      "export function warningsAfterDeepAudit",
    );

    expect(unavailable).not.toContain("verification-skipped");
    expect(unavailable).toContain("reduced-motion-skipped");
  });

  it("never puts page content into innerHTML", () => {
    for (const source of [panel, audit, overlay]) {
      expect(source).not.toContain("innerHTML");
      expect(source).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("takes the wording of the score from the reading, not from the markup", () => {
    expect(panel).toContain("auditScope(result, t)");
    expect(panel).toContain("{scope.kicker}");
    expect(panel).not.toContain("Expanded audit score");
    expect(panel).not.toContain("Quick audit");
    expect(panel).toContain("translator(UI_LOCALE)");
  });

  it("shows no score at all while the audit is still running", () => {
    const running = between(panel, "function Running(", "function Report(");
    expect(running).not.toContain("result.score");
    expect(running).not.toContain("/100");
    expect(panel).toContain(
      'const shown = state.kind === "done" ? state : walking && lastDone ? lastDone : null;',
    );
    expect(panel).toMatch(/\{shown && \(\s*<Report/);
  });

  it("names what each copy action copies, and titles the block it came from", () => {
    expect(details).toContain('<CopyButton label={t("panel.copySelector")}');
    expect(details).toContain('<CopyButton label={t("panel.copyHtml")}');
    expect(details).toContain("aria-label={label}");
    expect(details).toContain('t("panel.selector")');
    expect(details).toContain('t("panel.abbreviated")');
  });

  it("answers a highlight where the button that asked for it is", () => {
    const onPage = between(panel, "function OnPage(", "function ReadingLanguage(");
    expect(onPage).toContain('t("panel.locate")');
    expect(onPage).toContain('role="status"');
    expect(panel).toMatch(/located=\{[\s\S]{0,160}<OnPage/);
  });

  it("shows each element on the page as the reader steps to it", () => {
    expect(panel).toMatch(
      /const pick = \(index: number\) => \{[\s\S]{0,160}void showFinding\(inv\.selected, index, true\);/,
    );
    expect(panel).toContain("void showFinding(inv.selected, inv.occIndex, true);");
  });

  it("marks an opened finding on the page without moving it", () => {
    expect(panel).toMatch(/const go = [\s\S]{0,240}void showFinding\(f, index, false\);/);
  });

  it("keeps only the answer to the latest request when the reader steps quickly", () => {
    const report = between(panel, "function Report(", "function Message(");
    expect(report).toContain("const ask = ++latest.current;");
    expect(report).toContain("if (ask !== latest.current) return;");
  });

  it("goes back to the overview when the finding closes, and redraws an open one after the walk", () => {
    const report = between(panel, "function Report(", "function Message(");
    const settle = between(report, "const settle = useEffectEvent(", "<StickyBar");
    expect(settle).toContain('if (walking !== null || drawn.current === "path") return;');
    expect(settle).toContain(
      'if (drawn.current !== "finding") void showFinding(inv.selected, inv.occIndex, false);',
    );
    expect(settle).toMatch(/return;\s*\}\s*showOverview\(\);/);
    expect(settle).toContain("}, [inv.selectedId, walking, overview]);");
    expect(report).not.toContain("clear()");
  });

  it("says how many findings to fix have no mark on screen, and how many apply to the whole page, only while the overview is up", () => {
    expect(panel).toContain(
      "setUnseen(reply?.ok ? reply.report.missing.length + reply.report.offScreen.length : 0);",
    );
    expect(panel).toMatch(
      /message\.type === OVERLAY_VIEW && drawn\.current === "overview"[\s\S]{0,60}setUnseen\(message\.total - message\.shown\);/,
    );
    expect(panel).toMatch(/notices=\{\s*inv\.selectedId === null && !showing && walking === null/);
    expect(panel).toContain('unseen > 0 ? t("panel.notOnScreen", { count: unseen }) : null,');
    expect(panel).toContain('wholePage > 0 ? t("panel.wholePage", { count: wholePage }) : null,');
    expect(panel).toContain(".filter(appliesToWholePage).length");
    expect(overlay).toContain("viewTotal = focus === null ? marks.length : null;");
    expect(overlay).toContain("post({ type: OVERLAY_VIEW, shown, total: viewTotal });");
    expect(t("panel.notOnScreen", { count: 2 })).toBe(
      "2 problems to fix have no mark on screen right now. Open them from the list to find them.",
    );
    expect(pt("panel.notOnScreen", { count: 1 })).toBe(
      "1 problema a corrigir não tem marca na tela agora. Abra pela lista para encontrá-lo.",
    );
    expect(t("panel.wholePage", { count: 1 })).toBe(
      "1 problem to fix applies to the whole page, so it has no mark.",
    );
    expect(pt("panel.wholePage", { count: 2 })).toBe(
      "2 problemas a corrigir se aplicam à página inteira, por isso não têm marca.",
    );
  });

  it("shows each finding to fix on the page under its number in the queue", () => {
    const marks = between(panel, "function overviewMarks(", "type StopAlert");
    expect(marks).toContain("n: f.n,");
    expect(marks).toContain("tag: String(f.n),");
    expect(marks).toContain("tone: sevOf(f),");
    expect(marks).toContain("pick: `${FINDING_KEY}${f.id}:${first.index}`,");
    expect(marks).toContain("alternates: rest.map((o) => ({");
    expect(panel).toContain('overviewMarks(groups.find((g) => g.group === "fix")?.findings ?? [])');
    expect(panel).toContain(
      "const reply = await draw(overview, null, { scroll: false, path: false, timeoutMs: 0 });",
    );
  });

  it("returns to the overview when the tab order inspection ends with nothing open", () => {
    expect(panel).toContain(
      "void restoreScroll().then(open ? () => showFinding(open, index, false) : showOverview);",
    );
  });

  it("keeps the panel's port open, even after Chrome stops the worker, so closing it clears the page", () => {
    expect(panel).toContain("keepPort()");
    expect(panel).toMatch(/const draw: Draw = \([^)]*\) => \{\s*keepPort\(\);/);
    expect(panel).toMatch(/port = null;\s*setTimeout\(keepPort, 250\);/);
    expect(background).toContain("void restore().then(clearOverlay);");
  });

  it("sends one drawing at a time, in the order the reader asked for them", () => {
    expect(panel).toContain("let drawing: Promise<unknown> = Promise.resolve();");
    expect(panel).toContain("const reply = drawing.then(");
    expect(panel).toContain("drawing = reply.catch(() => undefined);");
  });

  it("offers a recoverable path when the content script fails", () => {
    expect(panel).toContain('state.kind === "error"');
    expect(panel).toContain("state.recoverable");
  });
});

describe("permissions stay minimal", () => {
  it("asks for nothing beyond the click, the injection, the panel, its state and the deep audit", () => {
    expect(manifest.permissions.sort()).toEqual([
      "activeTab",
      "debugger",
      "scripting",
      "sidePanel",
      "storage",
    ]);
  });

  it("asks for no host access at all", () => {
    expect(manifest.host_permissions).toBeUndefined();
  });
});

describe("pages the audit cannot read", () => {
  it("names a reason for each one", () => {
    expect(unsupportedReason("chrome://settings")).toBe("blocked.chromePages");
    expect(unsupportedReason("chrome-extension://abc/panel.html")).toBe("blocked.extensionPage");
    expect(unsupportedReason("https://chromewebstore.google.com/detail/x")).toBe(
      "blocked.webStore",
    );
    expect(unsupportedReason("file:///Users/me/page.html")).toBe("blocked.localFile");
    expect(unsupportedReason("https://example.com/report.pdf")).toBe("blocked.builtinViewer");
    expect(unsupportedReason(undefined)).toBe("blocked.noAddress");
  });

  it("lets an ordinary page through", () => {
    expect(unsupportedReason("https://www.wikipedia.org/")).toBeNull();
    expect(unsupportedReason("http://localhost:3002/results")).toBeNull();
  });
});

describe("assets the audit is not allowed to fetch", () => {
  it("says what was unreadable, in counts, never in URLs", () => {
    const one = crossOriginWarning({ styleSheets: 1, media: 0 }, t);

    expect(one.code).toBe("cross-origin-assets");
    expect(one.message).toContain("1 stylesheet on this page comes from another origin");
    expect(one.message).toContain("orientation lock");
    expect(one.message).not.toMatch(/https?:\/\//);
    expect(one.message).not.toContain("ProgressEvent");
  });

  it("counts stylesheets and media together", () => {
    const both = crossOriginWarning({ styleSheets: 3, media: 2 }, t);

    expect(both.message).toContain("3 stylesheets and 2 media files on this page come from");
  });

  it("keeps the rest of the reading intact in its wording", () => {
    expect(crossOriginWarning({ styleSheets: 1, media: 0 }, t).message).toContain(
      "Everything read from the page itself is unaffected",
    );
  });

  it("walks the page for lazy content before any rule reads it, on every audit", () => {
    const background = file("./background.ts");
    const prime = background.indexOf("__accessCheckPrime");
    const rules = background.indexOf('stage(url, "audit", "rules")');

    expect(prime).toBeGreaterThan(-1);
    expect(prime).toBeLessThan(rules);
    expect(background).not.toContain("opts.deep");
    expect(audit).toContain("dom.primeLazyContent()");
  });

  it("charges a page with nothing to scroll no second wait", () => {
    expect(audit).toContain(
      "if (prime.steps === 0) return { prime, readiness: settled, calm: null }",
    );
  });

  it("waits for content it just revealed to stop animating before the rules read it", () => {
    expect(audit).toContain("dom.waitForPaintCalm(prime.animatingBefore, PAINT_CALM_MS)");
    const prime = file("../../src/lib/scan/dom/prime.ts");
    expect(prime).toContain("if (running() <= baseline) break;");
    expect(prime).not.toContain("=== 0");
  });

  it("says the lazy content went unread only when it did", () => {
    const skipped = { code: "lazy-content-skipped" as const, message: "not read" };
    const other = { code: "audits-skipped" as const, message: "reduced motion" };

    expect(warningsAfterPriming([skipped, other], true)).toEqual([other]);
    expect(warningsAfterPriming([skipped, other], false)).toEqual([skipped, other]);
  });

  it("waits for the page to stop changing before the rules read it", () => {
    expect(audit).toContain("waitForContentReady(");
    expect(audit).toContain("CONTENT_SIGNATURE()");
    expect(audit).toContain("readiness ?? (await settleActiveDocument())");
    expect(audit).toContain("...(settled.settled ? [] : [contentUnsettled(t)])");
  });

  it("settles the page while it is still reading the structure, before the rules", () => {
    const background = file("./background.ts");
    const settle = background.indexOf("__accessCheckSettle");
    const rules = background.indexOf('stage(url, "audit", "rules")');
    const axe = background.indexOf("__accessCheckAudit");

    expect(settle).toBeGreaterThan(-1);
    expect(settle).toBeLessThan(rules);
    expect(rules).toBeLessThan(axe);
  });

  it("asks axe to preload only when every asset is readable", () => {
    expect(audit).toContain("const preload = assets.styleSheets === 0 && assets.media === 0");
    expect(audit).toMatch(/dom\.runAxe\(dom\.AXE_TAGS, \{\s*preload,/);
  });

  it("marks a finding's language only when it differs from the panel around it", () => {
    expect(panel).toContain("rowAttrs={langAttrs(result.locale, UI_LOCALE)}");
  });

  it("hands axe the locale the background resolved, rather than picking one itself", () => {
    expect(audit).toMatch(/dom\.runAxe\(dom\.AXE_TAGS, \{[\s\S]{0,80}locale: context\.axeLocale/);
    expect(audit).not.toContain("getUILanguage");
    expect(background).toContain("axeLocaleFor(locale)");
    expect(preference).toContain("normalizeReportLocale(chrome.i18n.getUILanguage())");
  });

  it("adds the warning only when it turned the preload off", () => {
    expect(audit).toContain("...(preload ? [] : [crossOriginWarning(assets, t)])");
  });
});

describe("the deep audit reuses the shared focus analysis", () => {
  const deep = file("./deep.ts");
  const background = file("./background.ts");

  it("walks the path with the shared loop and the shared analyser", () => {
    expect(deep).toContain('from "../../src/lib/scan/keyboard"');
    expect(deep).toContain("collectFocusPath(");
    expect(deep).toContain("buildKeyboardReport(raw, t)");
  });

  it("has no second implementation of the focus rules", () => {
    expect(deep).not.toContain("focus-not-visible");
    expect(deep).not.toContain("keyboard-trap");
    expect(deep).not.toContain("positive-tabindex");
    expect(deep).not.toMatch(/hasFocusIndicator|readingOrderInversions/);
  });

  it("uses the debugger only to type, and reads the page through the engine", () => {
    expect(deep).toContain("Input.dispatchKeyEvent");
    expect(deep).toContain("window.__accessCheckDom!.readFocusedStop()");
    expect(deep).not.toContain("DOM.getDocument");
    expect(deep).not.toContain("Runtime.evaluate");
  });

  it("always lets the debugger go, and says so when Chrome will not", () => {
    expect(deep).toMatch(/finally \{[\s\S]*chrome\.debugger[\s\S]*\.detach\(target\)/);
    expect(deep).not.toContain("chrome.debugger.detach(target).catch(() => {})");
    expect(deep).toContain("detachFailure");
  });

  it("treats a cancelled session as its own outcome", () => {
    expect(deep).toContain("chrome.debugger.onDetach.addListener");
    expect(deep).toContain("canceled_by_user");
    expect(deep).toContain("DeepAuditCancelled");
  });

  it("puts the deep result back through the shared accounting", () => {
    expect(background).toMatch(/withScoring\(\{\s*\.\.\.base,\s*keyboard,/);
    expect(background).not.toMatch(/publish\(\{ kind: "done", result: \{ \.\.\.base, keyboard/);
  });

  it("never reaches for the debugger in the audit the toolbar click runs", () => {
    const run = between(background, "async function runAudit(", "async function addFocusPath(");

    expect(run).not.toContain("withFocusPath");
    expect(run).not.toContain("runDeepAudit");
    expect(run).not.toContain("chrome.debugger");
    expect(run).toContain('publish({ kind: "done", result: base })');
  });

  it("runs that same audit, and nothing heavier, from the toolbar icon", () => {
    const click = between(background, "chrome.action.onClicked", "chrome.runtime.onConnect");

    expect(click).toContain("await runAudit(tab)");
    expect(click).not.toContain("deep");
  });

  it("attaches the debugger only where the focus path is walked", () => {
    const walk = background.slice(background.indexOf("async function withFocusPath("));
    expect(walk).toContain("runDeepAudit");

    const deep = file("./deep.ts");
    expect(deep).toContain("chrome.debugger.attach");
    expect(background).not.toMatch(/chrome\.debugger\.attach/);
  });

  it("never asks for the debugger at runtime, which Chrome refuses", () => {
    expect(panel).not.toContain("permissions.request");
    expect(background).not.toContain("permissions.request");
  });

  it("warns about the debugger before the reader asks for the walk, not during", () => {
    const section = between(panel, "panel.walkDebuggerNote", "panel.walkNow");

    expect(section).toContain('aria-describedby="walk-debugger-note"');
    expect(t("panel.walkDebuggerNote")).toContain("Chrome's debugger");
    expect(t("panel.walkDebuggerNote")).toContain("released as soon as the walk ends");
    expect(pt("panel.walkDebuggerNote")).toContain("depurador do Chrome");
  });

  it("offers one audit, not a quick one and a deep one", () => {
    expect(panel).not.toContain("panel.runQuickAudit");
    expect(panel).not.toContain("panel.quickAuditNote");
    expect(panel).toContain('t("panel.auditAgain")');
  });

  it("keeps the reading on screen when the deep audit fails", () => {
    const fallback = background.slice(
      background.indexOf("} catch (e) {", background.indexOf("async function withFocusPath(")),
    );
    expect(fallback).toContain("result: withScoring({ ...base, warnings: kept");
    expect(fallback).toContain("deepError: message");
  });

  it("lets go of a debugger the worker was killed while holding", () => {
    expect(background).toContain("chrome.debugger.detach({ tabId: saved.deepTabId })");
  });

  it("reads back what was audited on every message, not only the first", () => {
    const listener = background.slice(background.indexOf("chrome.runtime.onMessage.addListener"));
    const branches = listener
      .split(/if \(message\.type === /)
      .slice(1)
      .map((chunk) => [chunk.slice(0, chunk.indexOf(")")), chunk]);

    expect(branches.map(([name]) => name)).toEqual([
      '"panel:hello"',
      '"panel:focus-path"',
      '"panel:continue-walk"',
      '"panel:highlight"',
      '"panel:restore-scroll"',
      '"panel:clear-highlight"',
      '"panel:audit"',
    ]);
    for (const [name, chunk] of branches) {
      expect(chunk, `${name} acts without restoring the audited tab first`).toContain("restore()");
    }
  });

  it("refuses to run two audits at once", () => {
    expect(background).toMatch(/if \(running\) return;/);
    expect(background).toMatch(/finally \{\s*running = false;/);
  });

  it("stops saying the focus path was skipped once it has been walked", () => {
    expect(background).toContain("warningsAfterDeepAudit(warnings, t)");
    expect(background).toContain("warningsAfterDeepAudit(warnings, t, message)");
  });
});

describe("permissions after the deep audit", () => {
  it("declares the debugger up front, because Chrome will not take it as optional", () => {
    const raw = JSON.parse(file("../manifest.json"));
    expect(raw.permissions.sort()).toEqual([
      "activeTab",
      "debugger",
      "scripting",
      "sidePanel",
      "storage",
    ]);
    expect(raw.optional_permissions).toBeUndefined();
    expect(raw.host_permissions).toBeUndefined();
  });
});

describe("how much of the audit is behind the number", () => {
  const report = (over: Partial<KeyboardReport> = {}): KeyboardReport => ({
    totalStops: 12,
    totalInteractive: 12,
    reachableInteractive: 12,
    truncated: false,
    cycleComplete: true,
    startedAtTop: true,
    stoppedBy: "cycle" as const,
    focusPath: Array.from({ length: 12 }, (_, i) => ({
      n: i + 1,
      selector: `#s${i}`,
      label: `s${i}`,
      tag: "a",
      focusVisible: true,
      left: 1,
      top: 1,
      width: 1,
      height: 1,
    })),
    findings: [],
    ...over,
  });

  const result = (over: Partial<ScanResult> = {}) =>
    ({
      warnings: [{ code: "keyboard-skipped", message: "Check keyboard." }] as ScanWarning[],
      ...over,
    }) as ScanResult;

  it("names the tab it read, and says the focus path is still pending", () => {
    const scope = auditScope(result(), t);

    expect(scope.kicker).toBe("This tab");
    expect(scope.lead).toBe("Keyboard not checked yet");
    expect(scope.focusPath).toBe("skipped");
    expect(scope.note).toContain("not verified");
    expect(scope.note).toContain("Check keyboard");
  });

  it("never calls a reading complete, even with the focus path walked", () => {
    const scope = auditScope(result({ keyboard: report(), warnings: [] }), t);

    expect(scope.kicker).toBe("This tab");
    expect(scope.lead).toBeNull();
    expect(scope.focusPath).toBe("walked");
    expect(scope.badge).toBe("Includes keyboard focus path");
    expect(scope.note).toContain("not a full audit");
    expect(scope.note).not.toMatch(/\bcomplete\b/i);
    expect(scope.kicker).not.toMatch(/expanded/i);
  });

  it("says how much is missing in one line, and keeps the whole story separate", () => {
    const scope = auditScope(
      result({
        keyboard: report(),
        warnings: [
          { code: "contexts-skipped", message: "mobile viewport" },
          { code: "audits-skipped", message: "reduced motion" },
          { code: "cross-origin-assets", message: "a stylesheet" },
        ],
      }),
      t,
    );

    expect(scope.summary).toBe("Partial coverage · 2 checks unavailable");
    expect(scope.summary.length).toBeLessThan(60);
    expect(scope.note.length).toBeGreaterThan(scope.summary.length);
  });

  it("counts one missing check in the singular", () => {
    const scope = auditScope(
      result({ keyboard: report(), warnings: [{ code: "audits-skipped", message: "x" }] }),
      t,
    );

    expect(scope.summary).toBe("Partial coverage · 1 check unavailable");
  });

  it("says so plainly when nothing was skipped", () => {
    expect(auditScope(result({ keyboard: report(), warnings: [] }), t).summary).toBe(
      "Every check this build runs completed",
    );
  });

  it("does not present a walk that never reached the first control as whole", () => {
    const scope = auditScope(
      result({ keyboard: report({ startedAtTop: false }), warnings: [] }),
      t,
    );

    expect(scope.focusPath).toBe("partial");
    expect(scope.note).toContain("could not be taken back to the first control");
  });

  it("says where a truncated walk stopped", () => {
    const scope = auditScope(result({ keyboard: report({ truncated: true }), warnings: [] }), t);

    expect(scope.focusPath).toBe("truncated");
    expect(scope.kicker).toBe("This tab");
    expect(scope.badge).toBe("Keyboard check stopped at 12 stops");
    expect(scope.note).toContain("stopped early after 12 stops");
  });

  it("carries the reason the focus path did not finish into the report itself", () => {
    const kept = warningsAfterDeepAudit(
      [
        { code: "keyboard-skipped", message: "Check keyboard." },
        { code: "audits-skipped", message: "reduced motion" },
      ],
      t,
      "You stopped it.",
    );

    expect(kept[0]).toEqual({
      code: "keyboard-skipped",
      message: "The focus path was not walked. You stopped it.",
    });
    expect(kept).toHaveLength(2);
  });

  it("drops the invitation once the path has actually been walked", () => {
    const kept = warningsAfterDeepAudit(
      [
        { code: "keyboard-skipped", message: "Check keyboard." },
        { code: "audits-skipped", message: "reduced motion" },
      ],
      t,
    );

    expect(kept.map((w) => w.code)).toEqual(["audits-skipped"]);
  });
});

describe("the panel is an inspector, not a squeezed report", () => {
  it("puts the sections in inspecting order", () => {
    const report = between(panel, "function Report(", "function Message(");
    const order = [
      "<Header",
      "<FindingList",
      "<FocusPath",
      '<Collapsed title={t("panel.aboutAudit")}',
      't("panel.coverageLimitations")',
      "<ChecksPerformed",
      "<Capture",
      "</Collapsed>",
    ];
    const found = order.map((token) => report.lastIndexOf(token));

    expect(found.every((i) => i > -1)).toBe(true);
    expect([...found].sort((a, b) => a - b)).toEqual(found);
  });

  it("leads with the verdict, what is left to do, and what is left to check", () => {
    const order = [
      "STANDING_LABEL[standing]",
      "STANDING_NOTE[standing]",
      't("panel.toFix"',
      't("panel.toCheck"',
    ].map((token) => summary.indexOf(token));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    const header = between(panel, "function Header(", "function KeyboardCheck(");
    expect(header.indexOf("<KeyboardCheck")).toBeGreaterThan(header.indexOf("<Summary"));
    expect(header).not.toContain("{scope.summary}");
    expect(header).not.toContain("{scope.note}");
    expect(header).not.toContain("result.summary");
    expect(header).not.toContain("<dl");
  });

  it("names only the work that exists", () => {
    expect(summary).toContain("list.length > 0 &&");
    expect(t("panel.toFix", { count: 3 })).toBe("3 to fix");
    expect(pt("panel.toCheck", { count: 1 })).toBe("1 para conferir à mão");
  });

  it("offers the keyboard check where the reading says it is missing", () => {
    const keyboard = between(panel, "function KeyboardCheck(", "function Collapsed(");
    expect(keyboard).toContain("{pending ? scope.lead : scope.badge}");
    expect(keyboard).toMatch(/\{pending && \([\s\S]{0,400}onClick=\{onWalk\}/);
    expect(keyboard).toContain('aria-describedby="walk-debugger-note"');
    expect(keyboard).toContain('role="alert"');
    expect(keyboard).not.toContain("PRIMARY_BUTTON");
    const focus = between(panel, "function FocusPath(", "function Running(");
    expect(focus).not.toContain("onWalk");
    expect(focus).not.toContain("onContinue");
    expect(focus).toContain("if (!walked) return null;");
  });

  it("says what a keyboard round did, and leads to the problems it found", () => {
    const report = between(panel, "function Report(", "function Message(");
    expect(report).toContain("if (walking !== null) setRoundFrom(stops);");
    expect(report).toContain('.filter((f) => f.kind === "keyboard");');
    expect(report).toMatch(
      /keyboardProblems\.length > 0 \? \(\) => go\(keyboardProblems\[0\]\.id, 0, "nav"\) : null/,
    );
    const keyboard = between(panel, "function KeyboardCheck(", "function Collapsed(");
    expect(keyboard).toContain('role="status"');
    expect(keyboard).toContain('t("panel.roundChecked", { count: outcome.checked })');
    expect(keyboard).toContain("onClick={onShowKeyboard}");
    expect(keyboard).toContain("const outcome = error ? null : round;");
    expect(t("panel.roundChecked", { count: 200 })).toBe("This round checked 200 stops.");
    expect(pt("panel.roundProblems", { count: 1 })).toBe("1 problema de teclado está na fila.");
  });

  it("opens a problem inside a closed group when asked to show it", () => {
    expect(list).toContain("setOpened(new Set([...opened, holding]))");
    expect(investigation).toContain('row.querySelector<HTMLButtonElement>("h3 > button")?.focus(');
  });

  it("walks further in each round than the hosted scan, which has a time budget to keep", () => {
    const deep = file("./deep.ts");
    expect(deep).toContain("const ROUND_STOPS = 200;");
    expect(deep).toContain("{ maxMs: MAX_MS, maxStops: ROUND_STOPS, resumeFrom }");
  });

  it("clears the marks off the page before the keyboard walk reads it", () => {
    const deep = file("./deep.ts");
    expect(deep.indexOf("overlayClear()")).toBeGreaterThan(-1);
    expect(deep.indexOf("overlayClear()")).toBeLessThan(deep.indexOf("collectFocusPath("));
  });

  it("keeps the reading in place while the keyboard is checked", () => {
    expect(panel).toContain(
      'const walking = state.kind === "running" && state.task === "focus-path" ? state.stage : null;',
    );
    expect(panel).toContain('state.kind === "running" && !shown && (');
    const keyboard = between(panel, "function KeyboardCheck(", "function Collapsed(");
    expect(keyboard).toMatch(/if \(walking\) \{[\s\S]{0,300}<StageList/);
  });

  it("keeps the long limitations behind a section that starts closed", () => {
    expect(panel).toContain('<Collapsed title={t("panel.aboutAudit")} note={scope.summary}>');
    expect(panel).toContain("{scope.note}");
    expect(panel).not.toMatch(/<details[^>]*\sopen/);
  });

  it("gathers coverage, the checks and the screenshot into one section about the audit", () => {
    const report = between(panel, "function Report(", "function Message(");
    expect(report.match(/<Collapsed /g)).toHaveLength(1);
    const checks = between(panel, "function ChecksPerformed(", "function Capture(");
    const capture = between(panel, "function Capture(", "function OnPage(");
    expect(checks).not.toContain("<Collapsed");
    expect(capture).not.toContain("<Collapsed");
    expect(checks).toContain("<h3");
    expect(capture).toContain("<h3");
    expect(capture).toContain('t("panel.screenshot")');
    expect(panel).not.toContain('t("panel.evidence")');
  });

  it("names each mark on the screenshot the way the list does", () => {
    const capture = between(panel, "function Capture(", "function OnPage(");
    expect(capture).toContain("occurrenceTag(f.n, o.index, all.length)");
    expect(capture).toContain("<Locus");
  });

  it("keeps auditing again within reach from anywhere in the reading", () => {
    const bar = between(panel, "function StickyBar(", "function Header(");
    expect(bar).toContain('{t("panel.reaudit")}');
    expect(bar).toContain("disabled={busy}");
    const report = between(panel, "function Report(", "function Message(");
    expect(report).toContain("onReaudit={onReaudit}");
    expect(report).toContain("busy={walking !== null}");
    expect(report).not.toContain('t("panel.auditAgain")');
    expect(t("panel.reaudit")).toBe("Audit again");
    expect(pt("panel.reaudit")).toBe("Auditar de novo");
  });

  it("gives locating the page its own full-width action, with the copies below", () => {
    const onPage = between(panel, "function OnPage(", "function ReadingLanguage(");
    expect(onPage).toContain('t("panel.locate")');
    expect(onPage).toContain("className={PRIMARY_BUTTON}");
    expect(panel).toMatch(/const PRIMARY_BUTTON =\s*\n?\s*"w-full[^"]*bg-ink /);
    expect(details).toContain('label={t("panel.copySelector")}');
    expect(chain.indexOf("<ElementDetails")).toBeGreaterThan(chain.indexOf("chain.stations.map"));
  });

  it("reads an opened finding as a chain, then the raw details, then the way on", () => {
    const order = ["chain.stations.map", "<ElementDetails", "{footer}"].map((token) =>
      chain.indexOf(token),
    );
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(panel).toContain("footer={<ProblemNav");
  });

  it("keeps what was measured in the details, apart from the plain reason", () => {
    expect(details).toContain('t("panel.measured")');
    expect(details).toContain("{occ.measured}");
    const located = between(chain, "function Located(", "function Contrast(");
    expect(located).not.toContain("occ.measured");
  });

  it("starts the raw element data closed", () => {
    expect(details).toContain("<details");
    expect(details).not.toMatch(/<details[^>]*\sopen/);
    expect(details).toContain('t("panel.position")');
    expect(details).toContain('t("panel.abbreviated")');
  });

  it("steps between problems in list order and stops at either end", () => {
    expect(nav).toContain("const previous = siblings[at - 1] ?? null;");
    expect(nav).toContain("const next = siblings[at + 1] ?? null;");
    expect(nav).toContain("disabled={!previous}");
    expect(nav).toContain("disabled={!next}");
    expect(panel).toContain("<ProblemNav siblings={siblings} at={i}");
  });

  it("no longer calls the explanation of a keyboard stop evidence", () => {
    expect(panel).not.toContain('t("panel.evidence")');
  });

  it("names the focus-path controls, and says which stop is current", () => {
    expect(sequence).toContain('aria-label={t("panel.previousStop")}');
    expect(sequence).toContain('aria-label={t("panel.nextStop")}');
    expect(sequence).toContain('t("panel.stopOf", { at: at + 1, total: stops.length })');
    expect(sequence).toContain('aria-current={now ? "step" : undefined}');
    expect(sequence).toContain('t("panel.showComplete")');
    expect(panel).toContain('t("panel.exitInspection")');
  });

  it("inspects the tab order as a mode with one way out", () => {
    const focus = between(panel, "function FocusPath(", "function Running(");
    expect(focus).toMatch(/!showing \?[\s\S]{0,200}t\("panel\.showFocusPath"\)/);
    expect(focus).toContain("onClick={onExit}");
    expect(focus).not.toContain("panel.clearOverlay");
    expect(focus).not.toContain("panel.backToWhereYouWere");
    expect(t("panel.showFocusPath")).toBe("Inspect tab order");
    expect(pt("panel.exitInspection")).toBe("Sair");
  });

  it("puts the page back where it was before clearing the drawing", () => {
    const report = between(panel, "function Report(", "function Message(");
    expect(report).toContain("void restoreScroll().then(");
    expect(panel).toContain('restoreScroll={() => send({ type: "panel:restore-scroll" })}');
    expect(overlay).toContain(
      "const carried = drawPath && opts.path === true ? sessionScroll : null;",
    );
  });

  it("never opens or moves a finding while the tab order is inspected", () => {
    expect(panel).not.toContain("syncStop");
    expect(panel).not.toContain("setLastSync");
  });

  it("draws a small neighbourhood by default", () => {
    expect(panel).toContain("const NEIGHBOURS = 2");
    expect(panel).toContain("windowAround(marks, next)");
    expect(panel).toMatch(/everything \? wholePath\(marks, next\) : windowAround/);
  });

  it("does not paint an ordinary stop like a failure", () => {
    const stops = between(panel, "function stopMarks(", "function windowAround(");
    expect(stops).toContain('tone: "path"');
    expect(stops).toContain("ring: current && !s.focusVisible,");
    expect(stops).toContain("alert: alert?.tone,");
    expect(stops).toContain(
      "badge: current && alert ? { tag: alert.tag, tone: alert.tone, pick: alert.pick } : undefined,",
    );
    expect(overlay).toContain("path: PALETTE.path,");
    expect(overlay).toContain('import { PALETTE, withAlpha } from "../../palette";');
  });

  it("keeps the current mark loud and the rest quiet, and never by colour alone", () => {
    expect(overlay).toContain(".tag.current {");
    expect(overlay).toContain(".tag.quiet {");
    expect(overlay).toMatch(/current: \{ inset: 5, arm: "min\(13px, 42%\)", bar: 2\.5/);
    expect(overlay).toMatch(/sibling: \{ inset: 4, arm: "min\(8px, 40%\)", bar: 1\.5/);
    expect(overlay).toContain("el.textContent = mark.tag;");
    expect(panel).toContain("tag: occurrenceTag(f.n, o.index, total)");
  });

  it("puts a mark's tag beside the element instead of over what is being read", () => {
    const tags = between(overlay, "function placeTags(", "function place(");
    expect(tags).toContain("{ x: r.left - inset, y: r.top - inset - h - 2, w, h }");
    expect(tags).toContain("{ x: r.left - inset, y: r.bottom + inset + 2, w, h }");
  });

  it("lets the other occurrences give way when the page is crowded", () => {
    const tags = between(overlay, "function placeTags(", "function place(");
    expect(overlay).toContain("const SIBLING_TAGS = 4;");
    expect(tags).toContain("siblings.length > SIBLING_TAGS && !beside.has(p.mark.n)");
    expect(tags).toContain("free ?? (sibling ? null : nearestFree(");
  });

  it("runs the focus path through the numbered circles", () => {
    expect(overlay).toContain(
      "if (p.spot) return { x: p.spot.x + p.spot.w / 2, y: p.spot.y + p.spot.h / 2 };",
    );
  });

  it("travels only when the element cannot already be seen", () => {
    expect(overlay).toContain("if (!visible || clipped(found, r)) {");
    expect(overlay).toContain("export function overlayRestoreScroll()");
  });

  it("says which way to look when the element is off the page's screen", () => {
    expect(overlay).toContain("const side = sideOf(current.rect);");
    expect(panel).toContain('if (focused.side === "above") return t("chain.offAbove");');
    expect(panel).toContain('if (focused.side === "below") return t("chain.offBelow");');
  });

  it("says when the element is on the page but not showing, instead of staying silent", () => {
    expect(overlay).toMatch(
      /hidden:\s*current !== null &&\s*\(!rendered\(current\.el, current\.rect\) \|\| clipped\(current\.el, current\.rect\)\)/,
    );
    expect(panel).toContain('if (focused.hidden) return t("chain.notShowing");');
    expect(panel).toContain(
      'if (focused.side === "left" || focused.side === "right") return t("chain.notShowing");',
    );
  });

  it("lets a mark on the page pick its finding in the panel, and only from a real click", () => {
    expect(overlay).toContain("if (e.isTrusted) act();");
    expect(overlay).toContain("{ type: OVERLAY_PICK, key }");
    expect(panel).toContain("if (message.type === OVERLAY_PICK) fromPage(message.key);");
    expect(panel).toMatch(/go\(rest\.slice\(0, cut\), index, "mark"\)/);
  });

  it("links stops and findings once, and reads the link the same way in the strip and on the page", () => {
    expect(panel).toMatch(/findingsAtStops\([\s\S]{0,140}result\.keyboard\?\.targetStops,/);
    expect(panel).toContain('groups.filter((g) => g.group !== "recommend")');
    expect(panel).toContain("stopAlerts(atStops, findings)");
    expect(panel).toMatch(/const related: RelatedFinding\[\] = atStops\.flatMap/);
    expect(sequence).toContain("const alert = related.find((r) => r.stop === s.n);");
    expect(sequence).toContain("data-sev={alert?.sev}");
    expect(sequence).toContain('className={cn("flex rounded-full p-[3px]", alert && "ac-hatch")}');
    expect(sequence).toContain('t("marks.stopWithFinding", { stop: name, tag: alert.tag })');
    expect(overlay).toContain(".tag[data-alert]::before {");
    expect(overlay).toContain("var(--alert) 0 1.5px");
  });

  it("matches the walked stops to the findings' elements in the page, after the walk", () => {
    expect(background).toContain("const targetStops = await stopsForTargets(tabId, base, walked);");
    expect(background).toContain("window.__accessCheckDom!.matchStops(s, sel)");
    expect(background).toContain(
      "const keyboard = targetStops ? { ...walked, targetStops } : walked;",
    );
  });

  it("refuses to draw once the tab shows another page", () => {
    expect(background).toMatch(
      /if \(auditedTabId !== null && !\(await onAuditedPage\(auditedTabId\)\)\) \{\s*await clearOverlay\(\);\s*throw new MovedOn\(\);/,
    );
    expect(background).toContain("sameDocument(tab.url, state.result.finalUrl)");
    expect(background).toMatch(
      /e instanceof MovedOn \|\|[\s\S]{0,140}t\("background\.tabUnreachable"\)/,
    );
  });

  it("never takes focus or a click away from the page, and adds nothing to its tab order", () => {
    const swallow = between(overlay, "function swallow(", "function corners(");
    expect(swallow).toMatch(/\["pointerdown", "mousedown"\][\s\S]{0,120}e\.preventDefault\(\);/);
    expect(overlay).not.toMatch(/tabindex|tabIndex|\.focus\(/);
  });

  it("draws in its own shadow root, hidden from assistive technology", () => {
    expect(overlay).toContain('root.attachShadow({ mode: "open" })');
    expect(overlay).toContain('root.setAttribute("aria-hidden", "true");');
  });

  it("says a fix was tested on the page itself, since the extension has no copy", () => {
    expect(panel).toContain('testedOn="page"');
  });

  it("keeps its root shown when the page hides empty boxes", () => {
    expect(overlay).toContain('["display", "block"],');
    expect(overlay).toContain('root.style.setProperty(prop, value, "important");');
  });

  it("moves only when the reader allows motion", () => {
    expect(overlay).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(overlay).toMatch(/if \(current && current\.visible && !calm\(\)\)/);
  });
});

describe("what the walk says it covered", () => {
  const walk = (over: Partial<KeyboardReport> = {}): KeyboardReport => ({
    totalStops: 0,
    totalInteractive: 0,
    reachableInteractive: Math.min(over.focusPath?.length ?? 0, over.totalInteractive ?? 0),
    truncated: false,
    cycleComplete: true,
    startedAtTop: true,
    stoppedBy: "cycle",
    focusPath: [],
    findings: [],
    ...over,
  });

  const path = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      n: i + 1,
      selector: `#s${i}`,
      label: `s${i}`,
      tag: "a",
      focusVisible: true,
      left: 1,
      top: 1,
      width: 1,
      height: 1,
    }));

  it("never calls a control reachable just because the walk happened to visit it", () => {
    const { line, notes } = focusPathLines(
      walk({ focusPath: path(50), totalInteractive: 169, truncated: true, stoppedBy: "cap" }),
      t,
    );

    expect(line).toBe("Checked the first 50 of 169 detected controls.");
    expect(notes).toEqual([
      "Partial: the walk reached its 50-stop limit, so the remaining 119 controls were not evaluated.",
    ]);
    expect([line, ...notes].join(" ")).not.toMatch(/reachable/i);
  });

  it("counts the controls it reached, not the stops, when the two differ", () => {
    const { line, notes } = focusPathLines(
      walk({
        focusPath: path(100),
        totalInteractive: 99,
        reachableInteractive: 73,
        truncated: true,
        stoppedBy: "cap",
      }),
      t,
    );

    expect(line).toBe("Walked 100 stops and visited 73 of 99 detected controls.");
    expect(notes).toEqual([
      "Partial: the walk reached its 100-stop limit, so the remaining 26 controls were not evaluated.",
    ]);
  });

  it("claims the whole tab order only when it went all the way round", () => {
    const { line, notes } = focusPathLines(
      walk({ focusPath: path(12), totalInteractive: 12, stoppedBy: "cycle" }),
      t,
    );

    expect(line).toBe("Walked the full tab order: 12 stops across 12 detected controls.");
    expect(notes).toEqual([]);
  });

  it("says a walk ran out of time rather than blaming the cap", () => {
    const { notes } = focusPathLines(
      walk({ focusPath: path(8), totalInteractive: 30, truncated: true, stoppedBy: "timeout" }),
      t,
    );

    expect(notes[0]).toBe(
      "Partial: the walk ran out of time after 8 stops, so the remaining 22 controls were not evaluated.",
    );
  });

  it("names an iframe or shadow root as what ended the walk", () => {
    const { notes } = focusPathLines(
      walk({ focusPath: path(5), totalInteractive: 9, truncated: true, stoppedBy: "opaque" }),
      t,
    );

    expect(notes[0]).toContain("iframe or a shadow root");
    expect(notes[0]).toContain("the remaining 4 controls were not evaluated");
  });

  it("gets the singular right for one leftover control", () => {
    const { notes } = focusPathLines(
      walk({ focusPath: path(3), totalInteractive: 4, stoppedBy: "trap" }),
      t,
    );

    expect(notes[0]).toBe(
      "Partial: focus was trapped at stop 3, so the remaining 1 control was not evaluated.",
    );
  });

  it("gets the singular right for one stop and one control", () => {
    const { line } = focusPathLines(
      walk({ focusPath: path(1), totalInteractive: 1, stoppedBy: "cycle" }),
      t,
    );

    expect(line).toBe("Walked the full tab order: 1 stop across 1 detected control.");
  });

  it("does not invent leftovers when the cap and the total coincide", () => {
    const { notes } = focusPathLines(
      walk({ focusPath: path(50), totalInteractive: 50, truncated: true, stoppedBy: "cap" }),
      t,
    );

    expect(notes[0]).toBe(
      "Partial: the walk reached its 50-stop limit, so it may not have reached the end of the tab order.",
    );
  });

  it("says plainly when there was nothing to walk", () => {
    expect(focusPathLines(walk(), t).line).toBe(
      "No keyboard-focusable controls were found on this page.",
    );
  });

  it("reports both a late start and an early end", () => {
    const { notes } = focusPathLines(
      walk({
        focusPath: path(20),
        totalInteractive: 60,
        startedAtTop: false,
        truncated: true,
        stoppedBy: "cap",
      }),
      t,
    );

    expect(notes).toHaveLength(2);
    expect(notes[0]).toContain("could not be taken back to the first control");
    expect(notes[1]).toContain("20-stop limit");
  });
});

describe("the coverage line is concrete", () => {
  const bare = (warnings: ScanWarning[]) =>
    auditScope({ warnings, keyboard: undefined } as ScanResult, t);

  it("never says the word caveat", () => {
    const scope = bare([
      { code: "keyboard-skipped", message: "k" },
      { code: "cross-origin-assets", message: "c" },
    ]);

    expect(scope.summary).not.toMatch(/caveat/i);
    expect(scope.summary).toBe("Partial coverage · 1 check unavailable");
  });

  it("names a limitation that is not a missing check", () => {
    expect(bare([{ code: "content-unsettled", message: "x" }]).summary).toBe(
      "Partial coverage · page still changing",
    );
  });
});

describe("the panel reads as a document, not a stack of boxes", () => {
  it("gives every screen one main landmark and one h1", () => {
    expect(panel).toMatch(/function Shell\([\s\S]{0,200}<main /);
    expect(panel.match(/<main /g)).toHaveLength(1);
    expect(panel.match(/<h1 /g)).toHaveLength(1);
    expect(panel).toMatch(/function StickyBar\([\s\S]{0,400}<h1 /);
  });

  it("wraps every screen in that one shell, and heads each with the sticky bar", () => {
    expect(panel.match(/<Shell[\s>]/g)).toHaveLength(1);
    for (const screen of ["function Running(", "function Message(", "function Report("]) {
      const start = panel.indexOf(screen);
      const body = panel.slice(start, panel.indexOf("\nfunction ", start + 1));
      expect(body).not.toContain("<main");
      expect(body).toContain("<StickyBar");
    }
  });

  it("brings the shared focus brackets into the panel", () => {
    expect(between(panel, "function Shell(", "function StickyBar(")).toContain("ac-instrument");
  });

  it("keeps the audited page and where it stands in reach while the reader scrolls", () => {
    const bar = between(panel, "function StickyBar(", "function Header(");
    expect(bar).toContain("sticky top-0");
    expect(bar).toContain("onTop");
    expect(bar).toContain("STANDING_LABEL[standing]");
    expect(bar).toContain('t("panel.backToSummary")');
  });

  it("no longer leads the reading with a number out of a hundred", () => {
    const header = between(panel, "function Header(", "function KeyboardCheck(");
    expect(header).not.toContain("result.score");
    expect(header).not.toContain('t("panel.perHundred")');
    expect(header).toContain("const standing = standingOf(result.counts);");
    expect(summary).toContain("STANDING_LABEL[standing]");
  });

  it("says when a stored reading came from an older scoring model", () => {
    expect(panel).toContain("scoringIsCurrent(result)");
    expect(panel).toContain("standing.staleTitle");
  });

  it("descends h1 → h2 → h3 → h4 without skipping a level", () => {
    expect(panel).toMatch(/heading="h2"\s+headingId="verdict-heading"/);
    expect(panel).toContain('aria-labelledby="verdict-heading"');
    expect(list).toMatch(/<h2 id=\{`group-\$\{group\}`\}/);
    expect(list).toMatch(/<h3 className="m-0">\s*<button/);
    expect(chain).toMatch(/<h4 className=/);
    expect(details).toContain("<h4 ");
    const collapsed = between(panel, "function Collapsed(", "function ChecksPerformed(");
    expect(collapsed).toContain("<h2 className=");
  });

  it("carries exactly one filled button, and states the rest by weight", () => {
    expect(panel).toMatch(/const SECONDARY_BUTTON =\s*\n?\s*"w-full[^"]*border border-ink/);
    expect(panel.match(/bg-ink /g)).toHaveLength(1);
    const uses = panel.match(/PRIMARY_BUTTON\b/g) ?? [];
    expect(uses.length).toBeGreaterThan(1);
  });

  it("spaces the long sections with rules instead of nesting more cards", () => {
    const collapsed = between(panel, "function Collapsed(", "function ChecksPerformed(");
    expect(collapsed).toContain("border-t border-hairline");
    expect(collapsed).not.toContain("rounded");
    expect(panel).not.toContain("rounded-lg");
    expect(panel).not.toContain("shadow-");
  });

  it("breaks selectors, sentences and attributes rather than widening the panel", () => {
    expect(details).toMatch(/break-all text-steel">\{occ\.selector\}/);
    expect(details).toMatch(/<pre[\s\S]{0,200}overflow-auto[\s\S]{0,120}break-all/);
    const located = between(chain, "function Located(", "function Contrast(");
    expect(located).toContain("break-words");
    expect(chain).toMatch(/break-words text-ink-2">\{f\.desc\}/);
  });

  it("labels each part of the element instead of running them together", () => {
    for (const key of ["panel.selector", "panel.html", "panel.position", "detail.rule"]) {
      expect(details).toContain(`<dt className="text-muted">{t("${key}")}</dt>`);
    }
    expect(occurrences).toContain('t("stepper.position"');
    expect(occurrences).not.toMatch(/ of \$\{/);
  });

  it("says the severity in the row's mark, and not again in words", () => {
    expect(panel).not.toContain("severity");
    expect(list).toContain("<Tag n={f.n} sev={sevOf(f)}");
  });
});

describe("the panel works through a queue, not a report", () => {
  it("names each group of the queue", () => {
    expect(list).toContain('fix: "panel.group.fix"');
    expect(list).toContain('check: "panel.group.check"');
    expect(list).toContain('recommend: "panel.group.recommend"');
  });

  it("keeps what to fix open, and what to check or consider behind a closed section", () => {
    expect(list).toMatch(/group === "fix"[\s\S]{0,400}<section/);
    expect(list).toContain('new Set(["fix"])');
    expect(list).toContain("open={opened.has(group)}");
  });

  it("shows no empty group but the one that says nothing is left to fix", () => {
    expect(list).toContain("if (findings.length === 0) return null;");
    expect(panel).toContain('empty={t("panel.noFailures")}');
  });

  it("steps from a problem only to the next one in the same group", () => {
    expect(list).toContain("findings.map((f, i) => row(f, findings, i))");
    expect(panel).toContain("renderOpen={(f, siblings, i) => (");
  });

  it("drops the screenshot's vocabulary from the rows", () => {
    expect(list).not.toContain("marker");
  });

  it("tells a reader how to check a manual review instead of what to change", () => {
    const decide = between(chain, "function Decide(", "function Verdict(");
    expect(decide).toContain("reviewGuidance(f.ruleId, t)");
    expect(decide).toContain('t("panel.howToCheck")');
    expect(decide).toContain("<ol");
  });
});

describe("choosing the report language from the panel", () => {
  it("offers every language the report ships in, plus the browser's own", () => {
    expect(panel).toContain("REPORT_LOCALES.map");
    expect(panel).toContain("value={FOLLOW_BROWSER}");
    expect(panel).toContain('t("language.followBrowser")');
  });

  it("names the control instead of leaving a bare menu", () => {
    expect(panel).toContain('htmlFor="panel-language"');
    expect(panel).toContain('id="panel-language"');
    expect(panel).toContain('t("language.label")');
  });

  it("no longer pins the panel to whatever language Chrome runs in", () => {
    expect(panel).not.toContain("const UI_LOCALE = normalizeReportLocale");
    expect(panel).toContain("localeOf(preference)");
  });

  it("rebuilds the whole panel so no half-translated report is left behind", () => {
    expect(panel).toContain("location.reload()");
  });

  it("keeps the choice reachable from every state, not only a finished report", () => {
    expect(between(panel, "function Shell(", "function StickyBar(")).toContain("<LanguageChoice");
  });

  it("translates its own section headings instead of leaving one in English", () => {
    expect(panel).not.toContain("Findings · {findings.length}");
    expect(list).toContain("{t(GROUP_TITLE[group])}");
    expect(list).toContain("{findings.length}");
  });

  it("says so when the reading on screen was produced in another language", () => {
    const notice = between(panel, "function ReadingLanguage(", "function findingMarks(");
    expect(notice).toContain("locale === UI_LOCALE) return null");
    expect(notice).toContain('t("panel.readingLanguage"');
    expect(notice).toContain("onReaudit");
  });
});

describe("the service worker follows the same choice", () => {
  it("re-reads it per audit, since the worker outlives no decision", () => {
    expect(background).not.toContain("const LOCALE =");
    expect(background).toContain("await syncLocale();");
  });

  it("hears about a change made while it was already awake", () => {
    expect(background).toContain("chrome.storage.onChanged.addListener");
    expect(background).toContain("LOCALE_KEY in changes");
  });
});

describe("what the panel says about a reading-order guess", () => {
  it("shows the shared explanation instead of presenting it as a settled failure", () => {
    expect(chain).toContain('f.evidence === "heuristic"');
    expect(chain).toContain("evidence.heuristic.title");
    expect(chain).toContain("evidence.heuristic.body");
  });

  it("writes none of that wording itself", () => {
    const block = between(chain, 'f.evidence === "heuristic"', "panel.alsoFailsIn");
    expect(block).not.toMatch(/[Gg]eometric|[Rr]eading order|[Ss]core/);
  });

  it("counts what needs a human apart from the failures", () => {
    expect(summary).toContain('const toCheck = of("check");');
    expect(summary).toContain('const toFix = of("fix");');
  });
});

describe("naming the element comes from the shared engine", () => {
  it("asks the engine for identities instead of deriving them in the audit", () => {
    expect(audit).toContain("dom.collectIdentities(");
    expect(audit).toContain("identitySelectors(");
    expect(audit).not.toContain("closest(");
    expect(audit).not.toContain("parentElement");
  });

  it("renders the identity through the report's own formatter", () => {
    expect(panel).toContain('from "../../src/lib/report/identity"');
    expect(chain).toContain("describeElement(occ.selector");
  });

  it("keeps the selector as the thing Locate and Copy act on", () => {
    expect(details).toContain("{occ.selector}");
    expect(details).toContain("value={occ.selector}");
    expect(panel).toContain("selector: o.selector,");
  });

  it("carries the identities into the published result", () => {
    expect(audit).toContain("identities,");
  });
});

describe("the panel speaks about verification only when it happened", () => {
  it("takes the verdict from the shared chain instead of a second one", () => {
    expect(chain).toContain("verdictMessage(f.verdict, t, f.measurement)");
    expect(panel).not.toContain("seal.verified");
    expect(panel).not.toContain("border-verified");
  });

  it("keeps the fix's own test inside the verdict, folded", () => {
    const verdict = between(chain, "function Verdict(", "const END_KEY");
    expect(verdict).toContain('t("chain.howVerified")');
    expect(verdict).toContain("<details");
    expect(panel).not.toContain('t("detail.verificationResult")');
  });

  it("has no retired verification vocabulary left", () => {
    for (const retired of [
      "verdict.label.unverifiable",
      "verdict.label.noAutoFix",
      "verdict.label.complementary",
      "seal.notReaudited",
      "cue.sampled",
    ]) {
      expect(panel, retired).not.toContain(retired);
      expect(chain, retired).not.toContain(retired);
    }
  });
});

describe("the extension takes no contextual captures", () => {
  it("never scrolls the audited page to photograph it", () => {
    expect(audit).not.toContain("scrollToDocY");
    expect(audit).not.toContain("stickyInset");
    expect(audit).not.toContain("planCoverage");
    expect(audit).not.toContain("scan/regions");
    expect(audit).not.toMatch(/\bregions:/);
  });

  it("publishes only the visible tab as its capture", () => {
    expect(background).toContain("captureVisibleTab");
    expect(background).not.toContain("captureBeyondViewport");
  });
});
