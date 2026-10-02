# Chrome Web Store listing: AccessCheck

Everything the Developer Dashboard asks for, written out. Nothing here is
submitted automatically.

## Basics

- **Item name:** AccessCheck
- **Version:** 1.4.0
- **Category:** Developer Tools
- **Default language:** English (United States)
- **Visibility:** Public
- **Privacy policy URL:** `https://access-check.marianacastro.dev/privacy`

## Single purpose

> AccessCheck audits the accessibility of the page in the current tab and shows
> the results in the side panel.

Everything the extension does serves that one purpose: running the rules,
checking the keyboard focus order, and highlighting an element on the page.

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

The five files in `store/screenshots/`, in order, all 1280×800:

1. `1-verdict-and-findings.png`: the verdict, the work left and the queue
2. `2-element-identity.png`: a problem opened on its element, with what screen
   readers hear and what to change
3. `3-verified-fix.png`: a contrast problem measured, changed and tested on the
   page
4. `4-focus-path.png`: the tab order inspected stop by stop
5. `5-located-on-page.png`: an element found and marked on the live page

Regenerate them with `npm run build:screenshots`.

## How to use it (for the listing and for reviewers)

1. Open any ordinary web page.
2. Click the AccessCheck icon in the toolbar. The side panel opens and the audit
   runs. No debugger is attached at this point.
3. Open a problem in To fix. Its elements are marked on the page with numbers,
   and the problem reads in order: where it is, what was measured, what to
   change and whether the fix was tested. Press "Locate on page" to scroll to an
   element, or pick another one from the numbered chips.
4. Press "Check keyboard" to follow the real tab order. Chrome shows its own
   banner while the debugger is attached and releases it when the check ends.
   The top of the panel then says what the round found.
5. Press "Inspect tab order" under Focus path to step through the stops on the
   page, and "Exit" to clear them.

## Permission justifications

Short answers for the dashboard fields, one per permission.

- **activeTab**: "AccessCheck uses activeTab only after the user invokes the
  extension, so it can inspect the currently active page and display its
  accessibility audit. It does not access tabs in the background or without a
  user action."
- **scripting**: "AccessCheck uses scripting to run its packaged accessibility
  audit code in the current tab, inspect the page DOM and computed styles,
  identify affected elements, and display temporary location and focus order
  markers requested by the user. To confirm a computed contrast fix, it
  temporarily applies that single style to the element, runs the one rule
  again, and restores the original attribute immediately."
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

## What changed in 1.4.0

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
  "Locate on page" says so instead of doing nothing.
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
