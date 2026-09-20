# AccessCheck extension

Audits the page you are already on — including pages behind a login, on localhost
or on staging, which the hosted scanner cannot reach. Nothing leaves the browser:
no network calls, no storage, no account.

It runs the same engine as the hosted scanner: `dom-engine.js` here is the same
file `npm run build:engine` produces for the server to inject, byte for byte.
The panel renders the product's own report model and components.

## Build and load

```bash
npm run build:extension
```

Then in Chrome:

1. open `chrome://extensions`
2. turn on **Developer mode** (top right)
3. **Load unpacked** → pick the `extension/dist` folder
4. open any page, click the AccessCheck icon in the toolbar

The report opens in the Chrome side panel, beside the page you audited. The click is what grants access to that one tab
(`activeTab`), so the extension never has standing permission to any site — the
install prompt asks for no host access at all.

## One click, one audit

Clicking the icon runs the audit in three steps, and shows them as it goes:

1. checking page structure
2. running the accessibility rules
3. preparing the report

No step attaches the debugger, so clicking the icon never puts Chrome into its
debugging banner. The verdict appears after the last step and says plainly that
the keyboard focus path has not been walked yet.

Step 1 also waits for the page to stop changing, using the same content
signature (`elements | stylesheets | text length`) the hosted scanner uses, for
up to six seconds. A page that is still hydrating gives a different answer every
time it is asked, so a reading taken before it settles is marked
`content-unsettled` and says as much.

**Walk the focus path now** is a separate action beside the verdict, and the
panel states what it costs before you press it. It does not re-run the rules. If
it does not finish — you cancel it, DevTools is holding the tab, or Chrome
refuses to debug the page — everything already read is kept, the report says
which step stopped and why, and **Continue the walk** picks up at the stop it
reached instead of starting over. A partial audit is never turned into a total
failure.

## Naming the element

A finding is only useful if you can tell which element it means. axe answers
that with a CSS path, and on a production build that path is the class chain:
`.bg-gradient-left.dark\:bg-gradient-left-dark.border-primary\/10:nth-child(4) > .my-20.lg\:my-32…`,
501 characters of compiled Tailwind on react.dev.

So every element the report points at also carries a short name built from the
signals a developer actually greps for — the tag, one stable attribute (`id`,
`data-testid`, `name`, `href`, `src`, or a single readable class), the accessible
name, and the landmark it sits in:

| axe says                                                                   | the report says                                          |
| -------------------------------------------------------------------------- | -------------------------------------------------------- |
| `.bg-gradient-left.dark\:bg-gradient-left-dark…` (501 ch)                  | `span.text-gray-30 “example.com/”` · in `<article>`      |
| `#\34 9775499 > .title[align="right"][valign="top"] > .rank`               | `span.rank “1.”` · in `#bigbox`                          |
| `section:nth-of-type(5) > div:nth-of-type(2) > article:nth-of-type(4) > …` | `div “800px • WEBP”` · in `<section> “Optimized Images”` |

Framework-generated ids (`:r7:`, `tab-a1b2c3`) and hashed classes (`sc-fznKkj`,
`css-1x2y3z`) are left out on purpose: they are not in your source, so they
cannot help you find anything. When several elements would read the same way —
three cards with the same _Read more_ link — the name is numbered (`1 of 3`)
rather than made up.

The CSS selector is kept beside the name, not replaced by it: it is what
**Locate on page** and **Copy selector** use, and it is the only one of the two
that is guaranteed to be unique.

## Locating a finding on the page

Each keyboard finding opens into its occurrences: stop number, the element's
readable name, the region of the page it sits in, a sanitized snippet, the
measured rectangle, the CSS selector to hand to `querySelector`, and — for
`focus-not-visible` — the exact visual change that did not happen, with the
computed styles that show it. For `focus-order`, each jump is shown as
`Stop 8 → Stop 9` with the movement that was measured, marked as needing a
human check: geometry can show focus moved backwards, only a person can say the
intended reading order was broken.

**Locate on page** re-queries the selector, brings it into view only if it is
not already visible, and draws a temporary numbered box. **Show focus path**
opens a navigator — Previous, `Stop N of M`, Next — that draws the current stop
and two either side, so a fifty-stop page stays readable; **Show complete path**
draws them all. Stepping the page moves the panel to the same occurrence, and
**Back to where you were** returns the page to where inspecting began.

The overlay reads by colour _and_ by text: blue for an ordinary stop, amber for
one worth checking, red for a failure, with the current stop at full strength
and labelled while the rest are dimmed and numbered. Both actions say so plainly
when an element is no longer in the page, and when stops are outside the
viewport and therefore not drawn.

The drawing lives in one namespaced container at the document root: it is
`aria-hidden`, takes no events (`pointer-events: none`), never touches the
audited elements, and is removed on Clear, on a timeout, when another occurrence
is selected, when the panel is closed, and at the start of any audit. It is
never part of a reading — a check in `npm run check:deep` audits the page again
after a highlight and compares the DOM byte for byte.

Scrolling to an element happens only after that explicit click, and is not the
same thing as the audit putting your scroll position back.

## Automated check

```bash
npm run check:extension
```

Loads the built extension into a real Chromium, audits a fixture page and prints
what the report rendered, plus a before/after comparison of the audited DOM.

It patches a **copy** of the build to grant `<all_urls>`, because `activeTab` is
only granted by a genuine toolbar click and an automated browser cannot produce
one. The shipped manifest is untouched and stays `activeTab`-only.

## What this build checks

axe-core (WCAG A/AA 2.0–2.2 plus best practice), the target-size rules, the
live-region rules, marker positions on a screenshot of the visible viewport, and
the same verdict, counts, fix text and criteria as the hosted report.

Where a fix is a deterministic one — a contrast colour, not a guessed label — the
build applies it to the live DOM, re-runs that one rule, and puts the DOM back
byte for byte before reporting whether the rule cleared. That check needs no
debugger, so it runs inside the ordinary click.

Only those findings carry a verification label: **Verified fix** when the rule
stopped flagging the element, **Needs review** when the change was applied and it
still flags. Everything else is a suggestion that depends on what the page means,
so it is shown as one — no badge, no "not re-audited". On eight production pages
that is 49 of 55 findings, which is why the quiet case is the quiet one.

## Deep audit

The focus path walks the real focus order with genuine Tab keystrokes over the
DevTools Protocol, detaching the debugger again whether the walk succeeds, fails
or is cancelled. Chrome shows its own banner on the tab while it runs.

Chrome does not allow `debugger` in `optional_permissions` — it drops it and the
API never appears — so the permission is declared up front and granted at
install. Holding the permission is not the same as using it: the debugger is
attached only while the focus path is being walked, and released before the
report appears. The panel says so before the walk and while it runs.

Before walking, the audit takes the page back to the start of its tab order.
This matters more than it sounds: `blur()` does **not** move Chrome's sequential
focus navigation starting point, so without it a second audit picks up wherever
the first one stopped and measures a different set of controls — which is how
four runs of the same page each reported a different set of findings. The walk focuses the first
control it can see and steps back once to check nothing precedes it; a synthetic
Shift+Tab wraps to the end of the page instead of leaving through the top, and
landing _after_ the seed is how that wrap is told apart from a real predecessor.

If the page will not give the walk back to its first control, the report says so
and the reading is shown as a partial focus path. A walk that did not start at
the top is never allowed to conclude that controls are unreachable: it ran out
of document, which is not the same as having been everywhere.

The walk is capped at 50 stops and 20 seconds, stops on a trap or a completed
cycle, and puts focus and scroll back where they were. It cannot see inside
cross-origin iframes or open shadow roots: focus that moves in there ends the
walk, and the report says the path is partial rather than pretending to have
covered it.

## What it does not check

- **Mobile viewport** — needs viewport emulation
- **Reduced motion** — needs media emulation
- **Keyboard focus path, until you ask for it** — the walk needs the debugger, so
  it is a separate action rather than part of the click
- **iframes and closed shadow roots** — only the top frame is audited

Every one of these is listed in the report itself, and the result is marked
`partial`, so a reading from this build never poses as a full audit. The panel says
it is reading **this tab**, never a complete audit, for exactly this
reason.

## Reading one page, not three

Content that only renders when you scroll to it used to be woken by the focus
walk — **after** the rules had already read the page — and it stayed rendered.
So the first audit read one page and every audit after it read a fuller one:
on stripe.com the reading only settled from the second run on.

Measured on stripe.com, left alone: the page settles at 2843 elements after
830ms and does not move for the next twenty seconds. It was the audit that grew
it, not the page.

So step 1 now walks the viewport down the page itself, before any rule runs, and
puts the viewport back. Everything after it — the rules, the focus path, the
screenshot, the selectors and the verdict — reads the same, fully rendered page. A
page with nothing to scroll pays nothing for this (measured: 0 steps, 1ms); a
page with lazy content below the fold pays under a second (measured: 3 steps,
977ms, on the fixture in `npm run check:deep`).

Every audit does this, so no reading from this build is marked
`lazy-content-skipped`.

## Release

```bash
npm run build:icons       # extension icons + store/store-icon-128.png
npm run build:tile        # store/promo-tile-440x280.png, from the product lockup
npm run build:screenshots # store/screenshots/*.png, from a real audit of a fixture
npm run pack              # builds, validates and writes release/accesscheck-<version>.zip
npm run check:release     # unzips that archive, loads it in a real Chrome, checks the store assets
npm run smoke:package <dir>  # drives a loaded build end to end and prints what it observed
```

`smoke:package` takes the directory to load — the unzipped archive or
`extension/dist` — and prints one JSON object: whether the debugger was attached
during the plain audit, whether it was attached and released for the focus walk,
the element identity and selector on each finding, which findings carried a
verification seal, the panel's overflow at 200% zoom, and both locales. Running it
against the archive and against a fresh build should print the same object.

`npm run pack` refuses to package anything it did not expect, refuses to
overwrite an existing archive, and stages the files with a fixed timestamp so
the same contents always give the same checksum.

The store copy lives in [STORE-LISTING.md](STORE-LISTING.md) and the privacy
policy in [PRIVACY.md](PRIVACY.md). Everything the Developer Dashboard uploads
sits under `store/`; everything that ships inside the archive sits under
`extension/`. `release/` holds the built archives and is not tracked.
