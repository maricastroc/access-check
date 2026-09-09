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

const panel = file("./panel.tsx");
const audit = file("./audit.ts");
const manifest = JSON.parse(file("../manifest.json")) as {
  permissions: string[];
  host_permissions?: string[];
};

describe("the panel reuses the product's own report", () => {
  it("renders the shared findings list, not a second one", () => {
    expect(panel).toContain('from "../../src/lib/report/findings"');
    expect(panel).toContain("buildFindings(result)");
  });

  it("uses the shared components rather than copies", () => {
    expect(panel).toContain('from "../../src/components/ui/finding-row"');
    expect(panel).toContain('from "../../src/components/ui/warning-list"');
    expect(panel).toContain('from "../../src/components/ui/section-kicker"');
  });

  it("has no second implementation of the counts or the summary", () => {
    expect(panel).toContain("result.summary");
    expect(panel).not.toMatch(/violations\.filter\(/);
    expect(panel).not.toContain("computeScore");
    expect(panel).not.toContain("buildSummary");
  });

  it("never puts page content into innerHTML", () => {
    for (const source of [panel, audit]) {
      expect(source).not.toContain("innerHTML");
      expect(source).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("takes the wording of the score from the reading, not from the markup", () => {
    expect(panel).toContain("auditScope(result)");
    expect(panel).toContain("{scope.kicker}");
    expect(panel).not.toContain("Expanded audit score");
    expect(panel).not.toContain("Quick audit score");
  });

  it("shows no score at all while the audit is still running", () => {
    const running = panel.slice(
      panel.indexOf("function Running("),
      panel.indexOf("function Report("),
    );
    expect(running).not.toContain("result.score");
    expect(running).not.toContain("/100");
    expect(panel).toMatch(/state\.kind === "done" && \(\s*<Report/);
  });

  it("names what each copy action copies, and titles the block it came from", () => {
    expect(panel).toContain('<CopyButton label="Copy selector"');
    expect(panel).toContain('<CopyButton label="Copy HTML"');
    expect(panel).toContain("aria-label={label}");
    expect(panel).toContain('<Field label="Element">');
    expect(panel).toContain("Abbreviated with …");
  });

  it("answers a highlight where the button that asked for it is", () => {
    const occurrences = panel.slice(
      panel.indexOf("function Occurrences("),
      panel.indexOf("function Findings("),
    );
    expect(occurrences).toContain("Locate on page");
    expect(occurrences).toContain('role="status"');
    expect(occurrences).toContain("setNotice(await onLocate(occurrence))");
  });

  it("reopens the panel's port when the reader acts, rather than holding it open", () => {
    expect(panel).toContain("keepPort()");
    expect(panel).toMatch(/const draw = async \([\s\S]{0,200}keepPort\(\);/);
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
    expect(unsupportedReason("chrome://settings")).toMatch(/own pages/);
    expect(unsupportedReason("chrome-extension://abc/panel.html")).toMatch(/extension page/);
    expect(unsupportedReason("https://chromewebstore.google.com/detail/x")).toMatch(/Web Store/);
    expect(unsupportedReason("file:///Users/me/page.html")).toMatch(/file access/);
    expect(unsupportedReason("https://example.com/report.pdf")).toMatch(/viewer/);
    expect(unsupportedReason(undefined)).toMatch(/no address/);
  });

  it("lets an ordinary page through", () => {
    expect(unsupportedReason("https://www.wikipedia.org/")).toBeNull();
    expect(unsupportedReason("http://localhost:3002/results")).toBeNull();
  });
});

describe("assets the audit is not allowed to fetch", () => {
  it("says what was unreadable, in counts, never in URLs", () => {
    const one = crossOriginWarning({ styleSheets: 1, media: 0 });

    expect(one.code).toBe("cross-origin-assets");
    expect(one.message).toContain("1 stylesheet on this page comes from another origin");
    expect(one.message).toContain("orientation-lock");
    expect(one.message).not.toMatch(/https?:\/\//);
    expect(one.message).not.toContain("ProgressEvent");
  });

  it("counts stylesheets and media together", () => {
    const both = crossOriginWarning({ styleSheets: 3, media: 2 });

    expect(both.message).toContain("3 stylesheets and 2 media files on this page come from");
  });

  it("keeps the rest of the reading intact in its wording", () => {
    expect(crossOriginWarning({ styleSheets: 1, media: 0 }).message).toContain(
      "Everything read from the page itself is unaffected",
    );
  });

  it("walks the page for lazy content before any rule reads it", () => {
    const background = file("./background.ts");
    const prime = background.indexOf("__accessCheckPrime");
    const rules = background.indexOf('stage(url, mode, "rules")');

    expect(prime).toBeGreaterThan(-1);
    expect(prime).toBeLessThan(rules);
    expect(background).toContain("if (opts.deep)");
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
    expect(audit).toContain("...(settled.settled ? [] : [CONTENT_UNSETTLED])");
  });

  it("settles the page while it is still reading the structure, before the rules", () => {
    const background = file("./background.ts");
    const settle = background.indexOf("__accessCheckSettle");
    const rules = background.indexOf('stage(url, mode, "rules")');
    const axe = background.indexOf("__accessCheckAudit");

    expect(settle).toBeGreaterThan(-1);
    expect(settle).toBeLessThan(rules);
    expect(rules).toBeLessThan(axe);
  });

  it("asks axe to preload only when every asset is readable", () => {
    expect(audit).toContain("const preload = assets.styleSheets === 0 && assets.media === 0");
    expect(audit).toMatch(/dom\.runAxe\(dom\.AXE_TAGS, \{\s*preload,/);
  });

  it("hands axe the locale the background resolved, rather than picking one itself", () => {
    const background = file("./background.ts");
    expect(audit).toMatch(/dom\.runAxe\(dom\.AXE_TAGS, \{[\s\S]{0,80}locale: context\.axeLocale/);
    expect(audit).not.toContain("getUILanguage");
    expect(background).toContain("normalizeReportLocale(chrome.i18n.getUILanguage())");
    expect(background).toContain("axeLocaleFor(locale)");
  });

  it("adds the warning only when it turned the preload off", () => {
    expect(audit).toContain("...(preload ? [] : [crossOriginWarning(assets)])");
  });
});

describe("the deep audit reuses the shared focus analysis", () => {
  const deep = file("./deep.ts");
  const background = file("./background.ts");

  it("walks the path with the shared loop and the shared analyser", () => {
    expect(deep).toContain('from "../../src/lib/scan/keyboard"');
    expect(deep).toContain("collectFocusPath(");
    expect(deep).toContain("buildKeyboardReport(raw)");
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

  it("walks the focus path inside the main audit, before any score is published", () => {
    const run = between(background, "async function runAudit(", "async function addFocusPath(");
    const focus = run.indexOf('stage(url, mode, "focus")');
    const done = run.indexOf('publish({ kind: "done", result: walked.result');

    expect(focus).toBeGreaterThan(-1);
    expect(done).toBeGreaterThan(focus);
    expect(run).toMatch(
      /if \(!opts\.deep\) \{[\s\S]{0,160}publish\(\{ kind: "done", result: base \}\)/,
    );
  });

  it("never asks for the debugger at runtime, which Chrome refuses", () => {
    expect(panel).not.toContain("permissions.request");
    expect(background).not.toContain("permissions.request");
  });

  it("says the debugger is attached, for which step, and that it is let go", () => {
    expect(panel).toContain("attaches Chrome's debugger for that step only");
    expect(panel).toContain("released before the report appears");
    expect(panel).toContain("Chrome shows its own banner");
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
    expect(background).toContain("warningsAfterDeepAudit(warnings)");
    expect(background).toContain("warningsAfterDeepAudit(warnings, message)");
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
      warnings: [{ code: "keyboard-skipped", message: "Run the deep audit." }] as ScanWarning[],
      ...over,
    }) as ScanResult;

  it("calls a reading without a focus path preliminary, and says why", () => {
    const scope = auditScope(result());

    expect(scope.kicker).toBe("Quick audit score");
    expect(scope.lead).toBe("Preliminary result");
    expect(scope.focusPath).toBe("skipped");
    expect(scope.note).toContain("not verified");
    expect(scope.note).toContain("Run the deep audit.");
  });

  it("never calls a reading complete, even with the focus path walked", () => {
    const scope = auditScope(result({ keyboard: report(), warnings: [] }));

    expect(scope.kicker).toBe("Current-tab audit score");
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
    );

    expect(scope.summary).toBe("Partial coverage · 2 checks unavailable");
    expect(scope.summary.length).toBeLessThan(60);
    expect(scope.note.length).toBeGreaterThan(scope.summary.length);
  });

  it("counts one missing check in the singular", () => {
    const scope = auditScope(
      result({ keyboard: report(), warnings: [{ code: "audits-skipped", message: "x" }] }),
    );

    expect(scope.summary).toBe("Partial coverage · 1 check unavailable");
  });

  it("says so plainly when nothing was skipped", () => {
    expect(auditScope(result({ keyboard: report(), warnings: [] })).summary).toBe(
      "Every check this build runs completed",
    );
  });

  it("does not present a walk that never reached the first control as whole", () => {
    const scope = auditScope(result({ keyboard: report({ startedAtTop: false }), warnings: [] }));

    expect(scope.focusPath).toBe("partial");
    expect(scope.note).toContain("could not be taken back to the first control");
  });

  it("says where a truncated walk stopped", () => {
    const scope = auditScope(result({ keyboard: report({ truncated: true }), warnings: [] }));

    expect(scope.focusPath).toBe("truncated");
    expect(scope.kicker).toBe("Current-tab audit score");
    expect(scope.badge).toBe("Includes keyboard focus path · stopped at 12");
    expect(scope.note).toContain("stopped early after 12 stops");
  });

  it("carries the reason the focus path did not finish into the report itself", () => {
    const kept = warningsAfterDeepAudit(
      [
        { code: "keyboard-skipped", message: "Run the deep audit." },
        { code: "audits-skipped", message: "reduced motion" },
      ],
      "You stopped it.",
    );

    expect(kept[0]).toEqual({
      code: "keyboard-skipped",
      message: "The focus path was not walked. You stopped it.",
    });
    expect(kept).toHaveLength(2);
  });

  it("drops the invitation once the path has actually been walked", () => {
    const kept = warningsAfterDeepAudit([
      { code: "keyboard-skipped", message: "Run the deep audit." },
      { code: "audits-skipped", message: "reduced motion" },
    ]);

    expect(kept.map((w) => w.code)).toEqual(["audits-skipped"]);
  });
});

describe("the panel is an inspector, not a squeezed report", () => {
  const overlay = file("../../src/lib/scan/dom/overlay.ts");

  it("puts the sections in inspecting order", () => {
    const report = panel.slice(
      panel.indexOf("function Report("),
      panel.indexOf("function Message("),
    );
    const order = [
      "<Header",
      "<Findings",
      "<FocusPath",
      "Coverage limitations",
      "<ChecksPerformed",
      "<Capture",
    ];
    const found = order.map((token) => report.indexOf(token));

    expect(found.every((i) => i > -1)).toBe(true);
    expect([...found].sort((a, b) => a - b)).toEqual(found);
  });

  it("leads the score card with one line, not with the whole story", () => {
    const header = panel.slice(
      panel.indexOf("function Header("),
      panel.indexOf("function Collapsed("),
    );

    expect(header).toContain("{scope.summary}");
    expect(header).toContain("{scope.badge}");
    expect(header).not.toContain("{scope.note}");
  });

  it("keeps the long limitations behind a section that starts closed", () => {
    expect(panel).toContain('<Collapsed title="Coverage limitations"');
    expect(panel).toContain("{scope.note}");
    expect(panel).not.toMatch(/<details[^>]*\sopen/);
  });

  it("gives locating the page its own full-width action, with the copies below", () => {
    const occurrences = panel.slice(
      panel.indexOf("function Occurrences("),
      panel.indexOf("function Findings("),
    );
    const locate = occurrences.indexOf("Locate on page");
    const copies = occurrences.indexOf('label="Copy selector"');

    expect(locate).toBeGreaterThan(-1);
    expect(copies).toBeGreaterThan(locate);
    expect(occurrences).toContain("${PRIMARY_BUTTON}");
    expect(panel).toMatch(/const PRIMARY_BUTTON =\s*\n?\s*"w-full[^"]*bg-ink /);
  });

  it("orders an opened finding as problem, fix, occurrence, evidence, element", () => {
    const findings = panel.slice(
      panel.indexOf("function Findings("),
      panel.indexOf("function ChecksPerformed("),
    );
    const occurrences = panel.slice(
      panel.indexOf("function Occurrences("),
      panel.indexOf("function Findings("),
    );

    expect(findings.indexOf('<Field label="Problem">')).toBeLessThan(
      findings.indexOf('<Field label="Suggested fix">'),
    );
    expect(findings.indexOf('<Field label="Suggested fix">')).toBeLessThan(
      findings.indexOf("<Occurrences"),
    );
    expect(occurrences.indexOf("Occurrence {at + 1} of {total}")).toBeLessThan(
      occurrences.indexOf('<Field label="Evidence">'),
    );
    expect(occurrences.indexOf('<Field label="Evidence">')).toBeLessThan(
      occurrences.indexOf('<Field label="Element">'),
    );
  });

  it("names the focus-path controls, and says which stop is current", () => {
    expect(panel).toContain('aria-label="Previous stop"');
    expect(panel).toContain('aria-label="Next stop"');
    expect(panel).toContain("Stop {at} of {stops}");
    expect(panel).toContain("Show complete path");
    expect(panel).toContain("Clear overlay");
    expect(panel).toContain("Back to where you were");
  });

  it("draws a small neighbourhood by default", () => {
    expect(panel).toContain("const NEIGHBOURS = 2");
    expect(panel).toContain("windowAround(marks, next)");
    expect(panel).toMatch(/everything \? marks : windowAround/);
  });

  it("does not paint an ordinary stop like a failure", () => {
    expect(overlay).toContain('stop: "#1a56c4"');
    expect(overlay).toContain('attention: "#8a5a00"');
    expect(overlay).toContain('failure: "#b3261e"');
    expect(overlay).not.toContain("dashed");
  });

  it("keeps the current stop loud and the rest quiet, and never by colour alone", () => {
    expect(overlay).toContain('["opacity", focused ? "1" : "0.45"]');
    expect(overlay).toContain("`${mark.n} · ${mark.label ?? WORD[mark.kind]}`");
  });

  it("travels only when the element cannot already be seen", () => {
    expect(overlay).toContain("if (!visible) found.scrollIntoView(");
    expect(overlay).toContain("export function overlayRestoreScroll()");
  });
});

describe("what the walk says it covered", () => {
  const walk = (over: Partial<KeyboardReport> = {}): KeyboardReport => ({
    totalStops: 0,
    totalInteractive: 0,
    reachableInteractive: 0,
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
    );

    expect(line).toBe("Checked the first 50 of 169 detected controls.");
    expect(notes).toEqual([
      "Partial: the walk reached its 50-stop limit, so the remaining 119 controls were not evaluated.",
    ]);
    expect([line, ...notes].join(" ")).not.toMatch(/reachable/i);
  });

  it("claims the whole tab order only when it went all the way round", () => {
    const { line, notes } = focusPathLines(
      walk({ focusPath: path(12), totalInteractive: 12, stoppedBy: "cycle" }),
    );

    expect(line).toBe("Walked the full tab order: 12 stops across 12 detected controls.");
    expect(notes).toEqual([]);
  });

  it("says a walk ran out of time rather than blaming the cap", () => {
    const { notes } = focusPathLines(
      walk({ focusPath: path(8), totalInteractive: 30, truncated: true, stoppedBy: "timeout" }),
    );

    expect(notes[0]).toBe(
      "Partial: the walk ran out of time after 8 stops, so the remaining 22 controls were not evaluated.",
    );
  });

  it("names an iframe or shadow root as what ended the walk", () => {
    const { notes } = focusPathLines(
      walk({ focusPath: path(5), totalInteractive: 9, truncated: true, stoppedBy: "opaque" }),
    );

    expect(notes[0]).toContain("iframe or a shadow root");
    expect(notes[0]).toContain("the remaining 4 controls were not evaluated");
  });

  it("gets the singular right for one leftover control", () => {
    const { notes } = focusPathLines(
      walk({ focusPath: path(3), totalInteractive: 4, stoppedBy: "trap" }),
    );

    expect(notes[0]).toBe(
      "Partial: focus was trapped at stop 3, so the remaining 1 control was not evaluated.",
    );
  });

  it("gets the singular right for one stop and one control", () => {
    const { line } = focusPathLines(
      walk({ focusPath: path(1), totalInteractive: 1, stoppedBy: "cycle" }),
    );

    expect(line).toBe("Walked the full tab order: 1 stop across 1 detected control.");
  });

  it("does not invent leftovers when the cap and the total coincide", () => {
    const { notes } = focusPathLines(
      walk({ focusPath: path(50), totalInteractive: 50, truncated: true, stoppedBy: "cap" }),
    );

    expect(notes[0]).toBe(
      "Partial: the walk reached its 50-stop limit, so it may not have reached the end of the tab order.",
    );
  });

  it("says plainly when there was nothing to walk", () => {
    expect(focusPathLines(walk()).line).toBe(
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
    );

    expect(notes).toHaveLength(2);
    expect(notes[0]).toContain("could not be taken back to the first control");
    expect(notes[1]).toContain("20-stop limit");
  });
});

describe("the coverage line is concrete", () => {
  const bare = (warnings: ScanWarning[]) =>
    auditScope({ warnings, keyboard: undefined } as ScanResult);

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
  const panel = readFileSync(new URL("./panel.tsx", import.meta.url), "utf8");

  it("gives every screen one main landmark and one h1", () => {
    expect(panel).toMatch(/function Shell\([\s\S]{0,200}<main /);
    expect(panel.match(/<main /g)).toHaveLength(1);
    expect(panel.match(/<h1 /g)).toHaveLength(1);
    expect(panel).toMatch(/function StickyBar\([\s\S]{0,400}<h1 /);
  });

  it("wraps every screen in that one shell, and heads each with the sticky bar", () => {
    expect(panel.match(/<Shell>/g)).toHaveLength(1);
    for (const screen of ["function Running(", "function Message(", "function Report("]) {
      const body = panel.slice(panel.indexOf(screen), panel.indexOf(screen) + 2400);
      expect(body).not.toContain("<main");
      expect(body).toContain("<StickyBar");
    }
  });

  it("keeps the audited page and its score in reach while the reader scrolls", () => {
    const bar = panel.slice(
      panel.indexOf("function StickyBar("),
      panel.indexOf("function Header("),
    );
    expect(bar).toContain("sticky top-0");
    expect(bar).toContain("onTop");
    expect(bar).toContain("out of 100 — back to the summary");
  });

  it("descends h1 → h2 → h3 → h4 without skipping a level", () => {
    expect(panel).toMatch(/as="h2" id="score-heading"/);
    expect(panel).toMatch(/as="h2" id="findings-heading"/);
    expect(panel).toMatch(/function Field\([\s\S]{0,300}as="h4"/);
    const collapsed = panel.slice(panel.indexOf("function Collapsed("));
    expect(collapsed.slice(0, 600)).toContain("<h2 className=");
  });

  it("carries exactly one filled button, and states the rest by weight", () => {
    expect(panel).toContain("const PRIMARY_BUTTON =");
    expect(panel).toContain("const SECONDARY_BUTTON =");
    expect(panel).toMatch(/const SECONDARY_BUTTON =\s*\n?\s*"w-full[^"]*border border-ink/);
    const uses = panel.match(/\$\{PRIMARY_BUTTON\}/g) ?? [];
    expect(uses.length).toBeGreaterThan(0);
    expect(panel).toMatch(/Show focus path[\s\S]{0,120}|SECONDARY_BUTTON/);
  });

  it("spaces the long sections with rules instead of nesting more cards", () => {
    const collapsed = panel.slice(
      panel.indexOf("function Collapsed("),
      panel.indexOf("function Capture("),
    );
    expect(collapsed).toContain("border-t border-hairline");
    expect(collapsed).not.toContain("rounded");
    expect(panel).not.toContain("rounded-lg");
    expect(panel).not.toContain("shadow-");
  });

  it("breaks selectors, sentences and attributes rather than widening the panel", () => {
    const occurrences = panel.slice(
      panel.indexOf("function Occurrences("),
      panel.indexOf("function Findings("),
    );
    expect(occurrences).toMatch(/break-words text-muted">\{where\.join/);
    expect(occurrences).toMatch(/break-words text-body">\{occurrence\.reason\}/);
    expect(occurrences).toMatch(/break-all text-steel">\s*\n?\s*\{occurrence\.selector\}/);
    expect(occurrences).toMatch(/<pre[\s\S]{0,200}overflow-auto[\s\S]{0,120}break-all/);

    const findings = panel.slice(
      panel.indexOf("function Findings("),
      panel.indexOf("function ChecksPerformed("),
    );
    expect(findings).toMatch(/break-words text-body">\{f\.desc\}/);
    expect(findings).toMatch(/break-words text-body">\{f\.fixText\}/);
  });

  it("labels each part of an occurrence instead of running them together", () => {
    const occurrences = panel.slice(
      panel.indexOf("function Occurrences("),
      panel.indexOf("function Findings("),
    );
    for (const label of ["Evidence", "Position", "Element"]) {
      expect(occurrences).toContain(`<Field label="${label}">`);
    }
    expect(occurrences).toContain("Occurrence {at + 1} of {total}");
    expect(occurrences).toMatch(/total > 1 &&[\s\S]{0,80}<OccurrenceStepper/);
  });

  it("says the severity once, in the row, and not again in the body", () => {
    const row = readFileSync(
      new URL("../../src/components/ui/finding-row.tsx", import.meta.url),
      "utf8",
    );

    expect(row).toContain("severity");
    expect(panel).not.toContain("severity");
  });
});
