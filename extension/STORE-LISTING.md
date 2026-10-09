# Chrome Web Store listing: AccessCheck

Everything the Developer Dashboard asks for, written out. Nothing here is
submitted automatically.

## Basics

- **Item name:** AccessCheck
- **Version:** 1.6.0
- **Category:** Developer Tools
- **Default language:** English (United States)
- **Visibility:** Public
- **Privacy policy URL:** `https://access-check.marianacastro.dev/privacy`

## Single purpose

> AccessCheck audits the accessibility of the page in the current tab and shows
> the results in the side panel.

Everything the extension does serves that one purpose: running the rules,
checking the keyboard focus order, and marking on the page where the problems
are.

## Short description (110 / 132 characters)

> Inspect accessibility problems in the current tab: what failed, where it is,
> and the real keyboard focus path.

It ships inside the package as `extDescription` in
`extension/_locales/<locale>/messages.json`. The Portuguese version lives in
`pt_BR`.

## Detailed description

Typed into the dashboard once per language. Paste the files as they are:

- English: [`store/listing-en.txt`](../store/listing-en.txt)
- Português (Brasil): [`store/listing-pt-BR.txt`](../store/listing-pt-BR.txt)

## Screenshots

The three files in `store/screenshots/`, in order, all 1280×800 and captured at
125% zoom:

1. `1-focus-path.png`: the real tab order across the page, with the stops where
   it meets a problem
2. `2-overview.png`: every problem to fix, marked on the page under its number
   in the queue
3. `3-verified-fix.png`: a contrast problem measured, changed and tested on the
   page

Regenerate them with `npm run build:screenshots`.

## How to use it (for the listing and for reviewers)

1. Open any ordinary web page.
2. Click the AccessCheck icon in the toolbar. The side panel opens and the audit
   runs. No debugger is attached at this point. The page then marks each
   problem to fix that is on screen with its number in the queue.
3. Open a problem in To fix, from the queue or by clicking its number on the
   page. Its elements are marked on the page with numbers,
   and the problem reads in order: where it is, what was measured, what to
   change and whether the fix was tested. Press "Locate on page" to scroll to an
   element, or pick another one from the numbered chips.
4. Press "Check keyboard" to follow the real tab order. Chrome shows its own
   banner while the debugger is attached and releases it when the check ends.
   The top of the panel then says what the round found.
5. Press "Inspect tab order" under Focus path to step through the stops on the
   page, and "Exit" to leave. A stop where the path meets a problem carries a
   hatched ring in the problem's color, on the page and in the panel.

## Permission justifications

Short answers for the dashboard fields, one per permission.

- **activeTab**: "AccessCheck uses activeTab only after the user invokes the
  extension, so it can inspect the currently active page and display its
  accessibility audit. It does not access tabs in the background or without a
  user action."
- **scripting**: "AccessCheck uses scripting to run its packaged accessibility
  audit code in the current tab, inspect the page DOM and computed styles,
  identify affected elements, and draw numbered markers on the page while the
  report is open, showing where each problem is and the keyboard focus order.
  To confirm a computed contrast fix, it temporarily applies that single style
  to the element, runs the one rule again, and restores the original attribute
  immediately."
- **sidePanel**: "AccessCheck uses the Chrome Side Panel to display the audit
  verdict, the list of problems to fix, element details, the keyboard focus
  order and the coverage of the audit, alongside the page being inspected."
- **storage**: "AccessCheck keeps the current report in chrome.storage.session
  so it survives Chrome suspending the extension's service worker while the user
  reads it, and that is cleared when the browser closes. It also saves the
  report language the user picks in the panel (auto, en or pt-BR) in
  chrome.storage.local. Nothing about the audited pages is kept after the
  browser closes."
- **debugger**: "AccessCheck uses the debugger permission only when the user
  presses Check keyboard. It temporarily attaches to the current tab to send
  real Tab and Shift+Tab key events, so it can follow the page's actual keyboard
  focus order. The page itself is read through scripting, not through the
  debugger protocol. It detaches when the check finishes, is cancelled or
  fails. The standard accessibility audit does not use the debugger
  permission."

## Remote code

No. Every script is packaged in the extension. axe-core ships inside the
archive, and nothing is downloaded, evaluated from a string or loaded from a
remote URL.

## Data disclosures

Of the store's categories, the honest answer is that AccessCheck **handles**
website content locally but **collects** nothing, since nothing is transmitted
off the device.

| Category                            | Handled                                                                                                                                                   | Collected or transmitted |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Personally identifiable information | No                                                                                                                                                        | No                       |
| Health information                  | No                                                                                                                                                        | No                       |
| Financial and payment information   | No                                                                                                                                                        | No                       |
| Authentication information          | No                                                                                                                                                        | No                       |
| Personal communications             | No                                                                                                                                                        | No                       |
| Location                            | No                                                                                                                                                        | No                       |
| Web history                         | No                                                                                                                                                        | No                       |
| User activity                       | No                                                                                                                                                        | No                       |
| Website content                     | Yes: the DOM, computed styles, a screenshot of the visible viewport, selectors and abbreviated HTML of the audited tab, held only for the browser session | No                       |

Certifications to accept, all of which the code supports:

- the data is not being sold or transferred to third parties for purposes
  unrelated to the item's single purpose;
- it is not used or transferred for creditworthiness or lending;
- its use is limited to the user-facing feature described above.

## Notes for the reviewer (Test instructions field)

> The extension needs no account or setup. Open any page, click the toolbar
> icon, and the side panel opens with the audit.
>
> The `debugger` permission is used for one thing: sending Tab and Shift+Tab
> over the DevTools Protocol so the extension can follow the page's real
> keyboard focus order, which cannot be reproduced with synthetic events. It is
> attached only when the user presses "Check keyboard" and detached before the
> result is shown. The project's automated checks fail if a result is ever
> published while it is still attached. Nothing is read over the protocol: the
> page is read with `chrome.scripting`, the same way the rest of the audit reads
> it.
>
> Clicking the toolbar icon runs the whole audit, including the rules, the
> extension's own checks and the fix verification, without attaching the
> debugger at all.

## What changed in 1.6.0

- The panel moves from warm cream to a porcelain background with cool,
  navy-tinted bands, so the panel, its cards and the audited page separate
  more clearly. Navy ink stays.
- Severities sit on one red scale, ordered by lightness: critical is dark
  crimson with white numbers, serious and moderate are lighter with ink
  numbers and a dark edge. They tell apart without relying on hue, in the
  panel and in the marks drawn on the page.
- Hatches, the measured ratio and other small text use the darker tone of
  each severity, so they keep 4.5:1 on the panel's backgrounds.
- Notices that are not findings, such as "Keyboard not checked yet", the
  focus path notes and the Locate on page status, are steel blue instead of
  a severity color. The partial coverage box gets a neutral border and a
  steel mark.
- The panel keeps Atkinson Hyperlegible.

## What changed in 1.5.0

- Until the keyboard is checked, the verdict says the keyboard is not included
  yet, so its counts can be compared with the web report's.
- A keyboard check that stops early no longer lists the controls it never got
  to as findings. The coverage line still says how many were left. A control is
  reported as unreachable only after a full round from the first control.
- Locate on page and Check keyboard only act on the audited tab while it is in
  front. With another tab in front, the panel says the report is for another
  tab instead of drawing or walking on the hidden one.
- Every finding to fix is accounted for under the verdict: findings about the
  whole document, such as bypass or meta-refresh, count as applying to the
  whole page, and findings inside a shadow root get their own line.
- The current stop in the focus path keeps its hatched ring when it meets a
  finding.
- The notices next to Locate on page and under the focus path stay in the page
  while empty, so screen readers announce them when their text arrives.
- The language menu's arrow sits clear of the border.
- Every interface text was reviewed in both languages. English says finding,
  mark, check and "fix tested" throughout. Portuguese describes what happened
  instead of how the checks work, calls the tab order's stops "etapas", and no
  longer shows axe-core messages in English where axe's own Portuguese
  translation leaves them out.

## What changed in 1.4.0

- With no problem open, the page shows each problem to fix once, on the first
  of its elements that can be seen on screen, under its number in the queue.
  Clicking that number opens the problem.
- When some problems to fix have no mark on screen, because they sit lower on
  the page or in a part it hides, the panel says how many under the verdict.
  It also says how many apply to the whole page, such as a missing title or
  language, which never get a mark, so the marks and those lines add up to the
  number to fix.
- The focus path shows where it meets a problem: a stop on a problem's element
  gets a hatched ring in the problem's color, on the page and in the panel's
  list of stops, and only the current stop names the problem.
- The marks are removed once the tab shows a different page from the one
  audited, including another route of the same app, or once another tab is
  audited, and the panel says the tab moved on. They come back when the tab
  shows the audited page again, after going back or reloading. Clicking a mark
  never moves focus on the page.
- Check keyboard only walks the page that was audited. On another page it says
  the tab moved on and leaves the report as it was.
- The marks also go when the panel closes after Chrome put the extension to
  sleep, and auditing another tab clears the first one's marks in that case
  too.
- The marks follow the page when it moves or removes an element, and the
  problem named at the current stop never covers the number of a stop beside
  it.
- A text field with no label is no longer named by what was typed into it.
- Every problem reads as one chain, the same as on the site: why it matters,
  Located, Measured, Change, and then whether the fix was tested or needs a
  person. The selector, the HTML and the raw numbers stay under Details.
- Opening a problem marks each of its elements on the page with a number, such
  as 3·1 and 3·2. Numbered chips in the panel pick an element, and clicking a
  mark on the page picks it in the panel.
- The verdict shows each problem as a numbered square in its severity color,
  next to "to fix" and "to check by hand".
- New type and palette: Atkinson Hyperlegible, warm paper, dark ink and
  stronger severity colors.
- "Locate on page" works on pages whose CSS hides empty boxes, such as
  Shopify's Dawn theme, where the marks used to vanish.
- When the element sits in a closed menu, drawer or dialog, or off to the side,
  "Locate on page" says so instead of doing nothing. It also scrolls the box
  that holds the element, and no mark is drawn over what an element is
  scrolled out of.
- Problems crowded on one element or on elements side by side each keep a
  number that can be seen and clicked.
- Text in the panel's own severity colors reads at 4.5:1 or more.
- The text sample in a contrast problem wraps instead of being cut.
- A tested fix now says it was tested on this page and undone, which is what
  the extension does.

## What changed in 1.3.1

- The queue puts the most severe problem first again. A serious problem the
  extension measured itself, such as target size or a missing focus ring, no
  longer sorts ahead of a critical one from axe.

## What changed in 1.3.0 (since 1.2.1)

- The panel works as a queue: To fix, To check by hand and Recommendations,
  with a top line such as "7 to fix · 3 to check by hand".
- An opened problem reads Where, What to change, Why and Details, and every
  problem that points at an element can be located on the page, including the
  ones from axe.
- Manual review items are listed, with steps to check them.
- "Fix tested" replaces "Verified fix", so it no longer reads as if the reader
  had already fixed the problem.
- "Check keyboard" lives at the top, keeps the reader's place, covers up to 200
  stops a round and says what each round found.
- The tab order is inspected as a mode with Previous, Next and Exit, and Exit
  puts the page back where it was.
- Coverage, the checks performed and the screenshot live together under
  "About this audit", and "Audit again" stays in reach in the sticky bar.
- Shorter texts in both languages, without em dashes.
