# AccessCheck

Scan any public URL and get back **concrete, verified accessibility fixes** — not just a list of problems.

Most accessibility checkers tell you _what_ is broken. AccessCheck goes one step further: for each violation it generates the exact code to paste, **proves the fix works by re-running the audit after applying it**, and groups repeated issues so one change can resolve many elements at once.

It renders the page in a real headless browser, runs [axe-core](https://github.com/dequelabs/axe-core) against WCAG 2.1 A/AA rules, and turns the raw findings into an actionable report — a live preview with issue markers, color-blindness simulations, an accessibility score, a prioritized "Fix First" list, and an exportable PDF.

---

## How it works

```
URL → headless Chromium (Playwright) → inject axe-core → WCAG audit
    → deterministic fix generation (per node)
    → cluster identical fixes into groups
    → re-run axe per fix to verify it clears the violation
    → score + markers + report → UI / PDF
```

The scan runs server-side in a Node runtime (`/api/scan`) because Playwright needs a real browser. Locally it uses the full Playwright Chromium; on serverless it falls back to `playwright-core` + `@sparticuz/chromium`.

---

## Features

### Concrete, copy-paste fixes
Instead of restating the rule, each violation gets a generated snippet. Covered rules include:

- **Color contrast** — computes the nearest passing text color to the original via binary search (operating on rounded RGB so the suggested hex actually passes the target ratio), rather than dumping pure black/white.
- **Missing alt text** — infers a description with a cascade: element `title` → surrounding context (figcaption / wrapping link) → filename (stripping `@2x` and extensions), falling back to `alt=""` for decorative images.
- **Form labels** — suggests a `<label for>` (when there's an id) or an `aria-label`, guessing the text from placeholder / name / id.
- **Accessible names** — for buttons, links and ARIA controls without a name.
- **Document-level** — missing `<html lang>`, missing `<title>`, zoom-blocking viewport.
- **ARIA attributes** — lists the exact required-but-missing or not-allowed attributes axe reports.

### Fix validation (re-run the audit)
Each generated fix carries a structured DOM mutation. After the scan, AccessCheck applies that mutation in the page, re-runs axe scoped to the specific rule, then reverts — labeling each fix:

- **Verified** — the rule no longer flags the element. The fix is proven.
- **Needs review** — re-scan still flags it; the suggestion isn't enough on its own.
- _(unchecked)_ — fixes that can't be auto-applied safely (e.g. removing ARIA attributes) are not validated.

### Grouped fixes
When many nodes of the same violation share an identical fix (e.g. 14 buttons with the same contrast problem), they're collapsed into a single group — _"Resolves N elements"_ — validated once per group via a representative selector.

### Live preview with issue markers
A real screenshot of the scanned page with bounding-box overlays pointing at offending elements, ranked by severity.

### Vision simulations
Preview the page through filters: **Deuteranopia**, **Protanopia**, **Tritanopia**, **Low Vision**, and **Grayscale** — to check meaning survives without color.

### Accessibility score & prioritization
- A 0–100 score weighted by severity and occurrence count (with damping so it degrades gracefully).
- A **Fix First** list ordered by impact ÷ effort.
- Severity breakdown (critical / serious / moderate / minor) and passed-checks count.

### PDF export
Generate a shareable PDF report of the scan — useful for handing an audit to a client, manager, or compliance review.

---

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router) + **React 19** + **TypeScript**
- **[axe-core](https://github.com/dequelabs/axe-core)** — WCAG rule engine
- **[Playwright](https://playwright.dev)** / `playwright-core` + `@sparticuz/chromium` — headless rendering
- **Tailwind CSS v4**
- **Vitest** — unit tests for the deterministic core (remediation, scoring, grouping)

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter a URL, and run a scan.

> The scan launches a headless browser on the server, so the first run may take a few seconds to spin up Chromium.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm test` | Run the unit test suite (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint |
| `npm run format` | Format with Prettier |

---

## Project structure

```
src/
├── app/
│   ├── api/scan/route.ts       # scan endpoint (Node runtime, in-memory cache, rate limit)
│   ├── results/                # results page, split by concern
│   │   ├── results-view.tsx    #   orchestrator (state + fetch)
│   │   ├── preview-panel.tsx   #   screenshot + markers + vision simulations
│   │   ├── report-panel.tsx    #   composition of the report sections
│   │   ├── score-card.tsx      #   score ring + severity chips + export
│   │   ├── stat-tiles.tsx      #   summary tiles
│   │   ├── fix-first.tsx       #   prioritized fix list
│   │   ├── violations-list.tsx #   filterable violations + verified/grouped fixes
│   │   └── shared.ts           #   shared types + helpers
│   └── report/                 # PDF report view
└── lib/scan/
    ├── scan.ts                 # orchestration: render, audit, cluster, verify
    ├── remediate.ts            # deterministic fix generators (+ structured apply)
    ├── group.ts                # cluster identical fixes
    ├── derive.ts               # score, Fix First, summary
    ├── wcag.ts                 # WCAG criterion mapping
    ├── browser.ts              # browser executor (local vs serverless)
    └── types.ts                # shared scan types
```

---

## Testing

The deterministic core is unit-tested with Vitest — color math, the fix generators, scoring, and fix grouping. Notably, a property test sweeps many color/target combinations to guarantee every suggested contrast color actually passes its WCAG target after rounding.

```bash
npm test
```
