# Chrome Web Store listing — AccessCheck

Everything the Developer Dashboard asks for, written out. Nothing here is
submitted automatically.

## Basics

- **Item name:** AccessCheck
- **Version:** 0.9.0
- **Category:** Developer Tools
- **Default language:** English (United States)
- **Visibility:** Unlisted
- **Privacy policy URL:** `https://<the AccessCheck site>/privacy`

## Single purpose

> AccessCheck audits the accessibility of the page in the current tab and shows
> the results in the side panel.

Everything the extension does — running the rules, walking the keyboard focus
order, highlighting an element on the page — serves that one purpose.

## Short description (110 / 132 characters)

> Inspect accessibility problems in the current tab: what failed, where it is,
> and the real keyboard focus path.

## Detailed description

> AccessCheck inspects the page you are on and tells you what is wrong with it,
> where it is, and what to change.
>
> Click the toolbar icon and the audit runs in four steps, shown as it goes:
> it waits for the page to stop changing, walks the page so anything that only
> renders on scroll has rendered, runs the accessibility rules, and then walks
> the real keyboard focus order with genuine Tab keystrokes. The score appears
> only when all of that has finished, so it never drops later because a check
> ran late.
>
> Each finding opens into the elements it came from: what failed and why, the
> suggested fix, the stop number in the tab order, the selector, and a short
> abbreviated snippet of the element. "Locate on page" scrolls to the element
> and draws a temporary highlight; "Show focus path" numbers the stops on the
> page and lets you step through them, with the current stop highlighted and its
> neighbours dimmed so the page stays readable.
>
> The rules are axe-core (WCAG 2.0, 2.1 and 2.2, levels A and AA, plus best
> practice) together with this project's own checks for target size, live
> regions and the keyboard focus path.
>
> **What it does not check.** The mobile viewport, reduced-motion preferences
> and fixes verified against a live copy of the page are not covered here, and
> neither are cross-origin iframes or shadow roots. The report says so on every
> reading, and the score is labelled a current-tab audit score rather than a
> full audit.
>
> **Quick audit.** A secondary action runs the rules without attaching the
> debugger and without walking the focus path. It is faster, it is labelled a
> preliminary result, and it says plainly that the keyboard focus path was not
> verified.
>
> **Privacy.** Nothing leaves your browser. There is no account, no analytics
> and no tracking, and the rules engine is packaged inside the extension rather
> than downloaded.
>
> AccessCheck is also a hosted scanner that audits a public URL and produces a
> full report. This extension is a different thing: it inspects the tab you are
> already in, including pages behind a login, on localhost or on staging, which
> the hosted scanner cannot reach.

## How to use it (for the listing and for reviewers)

1. Open any ordinary web page.
2. Click the AccessCheck icon in the toolbar. The side panel opens and the audit
   runs; Chrome shows its own banner while the focus path is being walked.
3. Read the findings, open one, and use "Locate on page" or "Show focus path".
4. "Run quick audit" repeats the reading without the debugger.

## Permission justifications

Short answers for the dashboard fields, one per permission.

- **activeTab** — "The audit reads only the tab the user clicked the icon on.
  This grants access to that one tab, at that moment, instead of standing access
  to any site."
- **scripting** — "Injects the audit into the clicked tab and draws the
  temporary highlight when the user asks to locate an element."
- **sidePanel** — "The report is shown in Chrome's side panel, beside the page
  being audited."
- **storage** — "Keeps the current report in chrome.storage.session so it
  survives Chrome suspending the extension's service worker while the user reads
  it. Nothing is written to disk and nothing persists after the browser closes."
- **debugger** — "The keyboard focus path is walked with real Tab keystrokes,
  which only the DevTools Protocol can produce. The debugger is attached when
  the user starts an audit, used only to send Tab and Shift+Tab, and detached
  before the finished report is shown."

## Remote code

No. Every script is packaged in the extension. axe-core ships inside the
archive; nothing is downloaded, evaluated from a string, or loaded from a
remote URL.

## Data disclosures

Of the store's categories, the honest answer is that AccessCheck **handles**
website content locally but **collects** nothing — nothing is transmitted off
the device.

| Category                            | Handled                                                                                                                                      | Collected or transmitted |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Personally identifiable information | No                                                                                                                                           | No                       |
| Health information                  | No                                                                                                                                           | No                       |
| Financial and payment information   | No                                                                                                                                           | No                       |
| Authentication information          | No                                                                                                                                           | No                       |
| Personal communications             | No                                                                                                                                           | No                       |
| Location                            | No                                                                                                                                           | No                       |
| Web history                         | No                                                                                                                                           | No                       |
| User activity                       | No                                                                                                                                           | No                       |
| Website content                     | Yes — the DOM, computed styles, a screenshot of the visible viewport, selectors and abbreviated HTML of the audited tab, held in memory only | No                       |

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
> attached at the start of the walk and detached before the report is shown; the
> project's automated checks fail if a result is ever published while it is still
> attached. Nothing is read over the protocol — the page is read with
> `chrome.scripting`, the same way the rest of the audit reads it.
>
> "Run quick audit", the secondary button, performs the same audit without
> attaching the debugger at all.
