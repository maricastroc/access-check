# AccessCheck extension

Audits the page you are already on, including pages behind a login, on localhost
or on staging, which the hosted scanner cannot reach. Nothing leaves the browser:
no uploads, no account. The only things kept are the last report, in
`chrome.storage.session`, and the report language you picked, in
`chrome.storage.local` (see [PRIVACY.md](PRIVACY.md)).

**Install it from the [Chrome Web Store](https://chromewebstore.google.com/detail/accesscheck/odhbdcnojfgjbkbfajidablhibhhckgf).**

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

**Check keyboard** is a separate action under the verdict, and the panel says
what it costs before you press it. It does not re-run the rules, and it only
walks the page that was audited: on another page or route it says the tab moved
on. If it does not finish, because you cancel it, DevTools is holding the tab or
Chrome refuses to debug the page, everything already read is kept and the report
says why the keyboard was not checked. A round that stops at its limit keeps the stops it
reached, and **Continue where it stopped** picks up from there instead of
starting over. A partial audit is never turned into a total failure.

**Audit again** reads the page as it is now. On the same address, the panel then
says what changed since the previous audit: what was cleared, what is new, what
is still to fix, and whether the verdict moved. A finding is matched by its rule
and its element's selector, not by its number in the queue, which changes.
Keyboard findings are compared only when both audits walked the whole tab order.
The comparison lives in the open panel and is gone when it closes.

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

Each finding opens into its occurrences, numbered like its marks on the page
(`3·1`, `3·2`). A keyboard occurrence also shows its stop number, the element's
readable name, the region of the page it sits in, a sanitized snippet, the
measured rectangle, the CSS selector to hand to `querySelector`, and — for
`focus-not-visible` — the exact visual change that did not happen, with the
computed styles that show it. For `focus-order`, each jump is shown as
`Stop 8 → Stop 9` with the movement that was measured, marked as needing a
human check: geometry can show focus moved backwards, only a person can say the
intended reading order was broken.

With no finding open, the page shows the **overview**: each finding in To fix
once, on the first of its elements that can be seen, tagged with its number in
the queue and coloured by its severity. The tag moves to another element of the
same finding as the page scrolls, and clicking it opens the finding at that
element. An element that is transparent, hidden, or scrolled out of the box that
holds it gets no tag. The line under the panel's title says what the page shows,
such as "All findings · 5 of 7 marked here", and a line under the verdict says
how many findings apply to the whole page, such as a missing title or language,
which never get a mark. The marks, the ones off screen and those findings add up
to the number to fix, so an empty page never reads as a clean one.

Pointing at a finding in the panel, with the mouse or the keyboard, brings its
mark forward with the strong bracket and quiets the others, without scrolling the
page. When that mark is off screen, the finding's row says which way it is.
Pointing at a tag on the page lights its row in the panel.

Each tag looks for a place beside its element that leaves the page readable. It
tries the sides and corners at three distances, weighs each place by how much of
the page's text it would cover, then by how much of the other marked elements,
then by its distance, and never lands on another tag. A tag that has to move away
is tied to its element by a thin line.

Opening a finding marks its own elements instead, with the current one
bracketed, and says where to look when the element is above or below the
screen. **Locate on page** re-queries the selector and brings the element into
view only if it is not already visible, scrolling the box that holds it when
that box scrolls on its own. It says so plainly when the element is no longer in
the page, or is on the page but not showing, as in a closed menu, and draws no
mark over what an element is scrolled out of. The line under the title follows
the finding, as in "All findings › 4 · Text below the minimum contrast › 4·2".
**Clear** takes the marks off the page, and **All findings** draws the overview
again.

**Inspect tab order** opens a navigator, Previous, `Stop N of M` and Next, that
draws the current stop and two either side, so a long path stays readable.
**Show complete path** draws them all, and **Exit** puts the page back where
inspecting began. Previous, Next, the counter and Exit also sit in the line under
the title, so they stay in reach while the panel scrolls. A stop where the path meets a finding carries a hatched ring
in that finding's colour, on the page and in the panel's list of stops, and the
stop's accessible name says which finding it is. Only the current stop shows the
finding's tag beside its number and, for a focus finding, a ring around the
element. Clicking a stop's number moves the inspection there, and clicking the
finding's tag opens it.

**Follow my keyboard** moves the current stop with the real focus as you press
Tab on the page. It listens to focus changes in the page, without the debugger.
When the focused element is not one of the recorded stops, the panel says so
instead of picking the nearest one. It turns off on every way out of the tab
order and before the keyboard is checked again.

The marks read by text as well as colour: every tag carries a number, stops are
blue circles, and the current mark is larger and ringed while the others stay
lighter.

The drawing lives in one container at the document root, in its own shadow root
and `aria-hidden`. It adds nothing to the tab order and never touches the
audited elements. Only its numbers and the arrow shown for an element off screen
take a click or the pointer, and a click never moves focus or starts a selection on the page. It
follows the page as it scrolls, resizes, or moves and removes elements. It is
removed when the panel closes, at the start of any audit, when the tab moves to
another page or another route of the same app, and when the report gives way to
an error. When the tab moves on, the panel says so, and the drawing comes back
when the tab shows the audited page again, after going back or reloading. It is
never part of a reading: a check in `npm run check:deep` audits
the page again after a highlight and compares the DOM byte for byte, and the
signature the keyboard check uses to tell whether the walk changed the page
leaves it out.

The page scrolls only when you ask: Locate on page, an element chip, a step
along the tab order, or the arrow. That is not the same thing as the audit
putting your scroll position back.

## Previewing a fix

For a contrast or focus finding, the Change step offers **Preview on this page**.
It is the one change the extension makes to the page because you asked, and only
for these two kinds of fix, where the result is calculated:

- contrast gives each element the color its own fix names, as the fix
  verification does;
- focus adds the Change step's code exactly as it is written, so a fix that
  would lose to the page's own rule shows no change.

The change goes in through one style element of its own, with a bar on the page
that says nothing is saved and has its own Undo. **Before** and **After** switch
that style on and off, and while a contrast fix is shown, the gauge under
Measured shows the ratio with the change. **Undo** removes both, and the page's
markup is the same as before, byte for byte. A reload, Audit again, another page
or route, another tab and closing the panel do the same, and the preview is
always off before anything is measured. Only one preview is on at a time. For a
focus fix, **Try it in the tab order** opens the tab order at the element's stop
and turns on Follow my keyboard.

## Automated check

```bash
npm run check:extension
```

Loads the built extension into a real Chromium, audits a fixture page and prints
what the report rendered, plus a before/after comparison of the audited DOM.

It patches a **copy** of the build to grant `<all_urls>`, because `activeTab` is
only granted by a genuine toolbar click and an automated browser cannot produce
one. The shipped manifest is untouched and stays `activeTab`-only.

```bash
npm run check:marks
```

Audits the Northwind fixture (`scripts/northwind-fixture.mjs`) with the built
extension. It checks that the tags leave the page's text readable, that the panel
and the page point at each other, the line under the title, the comparison after
Audit again and Follow my keyboard. It also checks that a preview leaves nothing
behind after Undo, a reload, a tab change, Audit again or closing the panel.

## What this build checks

axe-core (WCAG A/AA 2.0–2.2 plus best practice), the target-size rules, the
live-region rules, marker positions on a screenshot of the visible viewport, and
the same verdict, counts, fix text and criteria as the hosted report.

Where a fix is a deterministic one — a contrast colour, not a guessed label — the
build applies it to the live DOM, re-runs that one rule, and puts the DOM back
byte for byte before reporting whether the rule cleared. That check needs no
debugger, so it runs inside the ordinary click.

Only those findings say whether the fix was tested: the row reads **fix tested**
and the chain ends in **Verified** when the rule stopped flagging the element,
and both say it **still fails** when the change was applied and the rule still
flags it. Everything else is a suggestion that depends on what the page means,
so it is shown as one, with nothing claiming it was tested. On eight production pages
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

Each round of the walk is capped at 200 stops and 20 seconds, stops on a trap
or a completed cycle, and puts focus and scroll back where they were. The hosted
scanner keeps its own cap of 50 stops, because it has a time budget to keep. The
walk cannot follow focus into an iframe or an open shadow root: focus that moves
in there ends the walk, and the report says the path is partial rather than
pretending to have covered it.

## What it does not check

- **Mobile viewport** — needs viewport emulation
- **Reduced motion** — needs media emulation
- **Keyboard focus path, until you ask for it** — the walk needs the debugger, so
  it is a separate action rather than part of the click
- **iframes and closed shadow roots** — the rules read only the top frame and open
  shadow roots, and a finding inside a shadow root is listed without a place on
  the page

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
npm run build:icons       # extension icons + store/store-icon-128.png, in the product colors
npm run build:tile        # store/promo-tile-440x280.png, the symbol marked as the product marks a page
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
