import { buildFindings, type FindingView } from "../../src/lib/report/findings";
import type { ScanResult } from "../../src/lib/scan/types";

const app = document.getElementById("app")!;

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function originOf(f: FindingView): string {
  const parts = [
    f.severity ?? "best practice",
    f.passLabel ?? "axe-core",
    [f.criterionSc, f.criterionName].filter(Boolean).join(" · "),
  ];
  return parts.filter(Boolean).join(" · ");
}

function findingRow(f: FindingView): HTMLElement {
  const wrap = el("div", "finding");
  wrap.append(el("div", `sev ${f.severity ?? "minor"}`, `${f.n}. ${originOf(f)}`));
  wrap.append(el("h3", undefined, f.title));

  const meta = el("div", "meta");
  meta.append(
    document.createTextNode(`${f.elements} element${f.elements === 1 ? "" : "s"} · `),
    el("code", undefined, f.ruleId),
  );
  wrap.append(meta);

  if (f.contexts.length > 0) {
    wrap.append(el("p", "meta", `Also fails in: ${f.contexts.join(", ")}`));
  }
  wrap.append(el("p", "fix", f.fixText));
  if (f.fixCode) wrap.append(el("pre", undefined, f.fixCode));
  return wrap;
}

function render(scan: ScanResult) {
  app.textContent = "";

  app.append(el("h1", undefined, scan.title));
  app.append(el("div", "url", scan.finalUrl));

  const head = el("div", "card");
  head.append(el("p", "kicker", scan.partial ? "Partial audit score" : "Internal priority score"));
  head.append(el("div", "score", String(scan.score)));
  if (scan.partial) {
    head.append(
      el(
        "p",
        "partial",
        "Some checks did not run in this environment, so this score is not comparable with a full audit.",
      ),
    );
  }
  const counts = el("div", "counts");
  const pairs: [string, number][] = [
    ["critical", scan.counts.critical],
    ["serious", scan.counts.serious],
    ["moderate", scan.counts.moderate],
    ["minor", scan.counts.minor],
    ["passed", scan.counts.passed],
    ["best practice", scan.counts.bestPractice],
    ["manual review", scan.counts.manualReview],
  ];
  for (const [label, n] of pairs) {
    const item = el("span");
    item.append(el("b", undefined, String(n)), document.createTextNode(` ${label}`));
    counts.append(item);
  }
  head.append(counts);
  head.append(el("p", "meta", scan.summary));
  app.append(head);

  if (scan.screenshot) {
    const card = el("div", "card");
    card.append(el("p", "kicker", "Screenshot · visible viewport"));
    const fig = el("figure");
    const img = document.createElement("img");
    img.src = scan.screenshot;
    img.alt = `Screenshot of ${scan.finalUrl}`;
    fig.append(img);
    for (const m of scan.markers) {
      const box = el("span", "marker");
      box.style.left = `${m.left}%`;
      box.style.top = `${m.top}%`;
      box.style.width = `${m.width}%`;
      box.style.height = `${m.height}%`;
      box.title = `${m.n}. ${m.label}`;
      fig.append(box);
    }
    card.append(fig);
    app.append(card);
  }

  const findings = buildFindings(scan);
  const list = el("div", "card");
  list.append(el("p", "kicker", `Findings · ${findings.length}`));
  if (findings.length === 0) {
    list.append(el("p", "meta", "None of the checks this build runs found a failure."));
  }
  for (const f of findings) list.append(findingRow(f));
  app.append(list);

  const gaps = el("div", "card gap");
  gaps.append(el("p", "kicker", "Not checked in this build"));
  const ul = el("ul");
  for (const w of scan.warnings ?? []) ul.append(el("li", undefined, w.message));
  gaps.append(ul);
  app.append(gaps);
}

chrome.runtime.sendMessage("result", (scan: (ScanResult & { error?: string }) | null) => {
  if (!scan) {
    app.textContent = "No result to show. Click the AccessCheck icon on a page to audit it.";
    return;
  }
  if (scan.error) {
    app.textContent = `The audit could not run: ${scan.error}`;
    return;
  }
  render(scan);
});
