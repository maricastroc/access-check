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

## One audit, one score

Clicking the icon runs the whole audit in four steps, and shows them as it goes:

1. checking page structure
2. running the accessibility rules
3. walking the focus path
4. preparing the report

The score appears only after the last step. Nothing is published as a finished
reading before the focus path has been walked, so a number can never drop later
because a check ran late.

Step 1 also waits for the page to stop changing, using the same content
signature (`elements | stylesheets | text length`) the hosted scanner uses, for
up to six seconds. A page that is still hydrating gives a different answer every
time it is asked, so a reading taken before it settles is marked
`content-unsettled` and says as much.

If step 3 does not finish — you cancel it, DevTools is holding the tab, or
Chrome refuses to debug the page — the rest of the audit is kept and shown as a
**Quick audit score**, marked _Preliminary result_, saying which step stopped
and why. A partial audit is never turned into a total failure.

**Quick audit** is available as a secondary action for the cases where the
expanded audit cannot run at all. It is labelled _Quick audit score ·
Preliminary result_, states that the focus path was not verified, and offers to
walk it afterwards without re-running the rules.

## Locating a finding on the page

Each keyboard finding opens into its occurrences: stop number, selector, tag,
accessible name, a sanitized snippet, the measured rectangle, and — for
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
the same score, counts, fix text and criteria as the hosted report.

## Deep audit

Step 3 of the audit walks the real focus order with genuine Tab keystrokes over
the DevTools Protocol, detaching the debugger again whether the walk succeeds,
fails or is cancelled. Chrome shows its own banner on the tab while it runs.

Chrome does not allow `debugger` in `optional_permissions` — it drops it and the
API never appears — so the permission is declared up front and granted at
install. Holding the permission is not the same as using it: the debugger is
attached only while the focus path is being walked, and released before the
report appears. The panel says so before the walk and while it runs.

Before walking, the audit takes the page back to the start of its tab order.
This matters more than it sounds: `blur()` does **not** move Chrome's sequential
focus navigation starting point, so without it a second audit picks up wherever
the first one stopped and measures a different set of controls — which is how
the same page scored 46, then 37, then 34, then 23. The walk focuses the first
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
- **Verified fixes** — the hosted flow applies each fix and re-runs the rule; that
  writes to the page, so this build does not do it
- **Lazy content, on a quick audit only** — the expanded audit walks the page
  first, like the hosted flow; the quick audit does not, so content below the
  fold may be missed there
- **iframes and closed shadow roots** — only the top frame is audited

Every one of these is listed in the report itself, and the result is marked
`partial`, so a reading from this build never poses as a full audit. The score is
called an **Expanded audit score**, never a complete one, for exactly this
reason.

## Reading one page, not three

Content that only renders when you scroll to it used to be woken by the focus
walk — **after** the rules had already read the page — and it stayed rendered.
So the first audit scored one page and every audit after it scored a fuller one:
on stripe.com that was 46, then 21, then 21.

Measured on stripe.com, left alone: the page settles at 2843 elements after
830ms and does not move for the next twenty seconds. It was the audit that grew
it, not the page.

So step 1 now walks the viewport down the page itself, before any rule runs, and
puts the viewport back. Everything after it — the rules, the focus path, the
screenshot, the selectors and the score — reads the same, fully rendered page. A
page with nothing to scroll pays nothing for this (measured: 0 steps, 1ms); a
page with lazy content below the fold pays under a second (measured: 3 steps,
977ms, on the fixture in `npm run check:deep`).

The quick audit does not do this — that is what keeps it quick — so it is marked
`lazy-content-skipped` and says that anything below the fold went unread.

## Release

```bash
npm run build:icons       # extension icons + store/store-icon-128.png
npm run build:tile        # store/promo-tile-440x280.png, from the product lockup
npm run build:screenshots # store/screenshots/*.png, from a real audit of a fixture
npm run pack              # builds, validates and writes release/accesscheck-<version>.zip
npm run check:release     # unzips that archive, loads it in a real Chrome, checks the store assets
```

`npm run pack` refuses to package anything it did not expect, refuses to
overwrite an existing archive, and stages the files with a fixed timestamp so
the same contents always give the same checksum.

The store copy lives in [STORE-LISTING.md](STORE-LISTING.md) and the privacy
policy in [PRIVACY.md](PRIVACY.md). Everything the Developer Dashboard uploads
sits under `store/`; everything that ships inside the archive sits under
`extension/`. `release/` holds the built archives and is not tracked.
