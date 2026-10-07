# AccessCheck extension: privacy policy

**Effective 5 October 2026.** This policy covers the AccessCheck browser
extension. The hosted scanner at the AccessCheck website is a separate product
with its own storage; this policy is only about the extension.

## The short version

The extension reads the page you ask it to audit, in your browser, and shows you
what it found. Nothing it reads leaves your browser. There is no account, no
analytics and no tracking.

## What the extension reads

When you click the AccessCheck icon on a tab, and only then, it reads that one
tab:

- **The page's DOM**: elements, attributes, computed styles and positions, so
  the rules can decide what passes and what fails.
- **A screenshot of the visible viewport**: one JPEG, shown with its marks
  under "About this audit" in the panel.
- **CSS selectors** for the elements a finding refers to, so you can locate them.
- **A short, abbreviated HTML snippet** for each occurrence. It is rebuilt from a
  fixed list of attributes (id, class, type, role, name, alt, title, placeholder,
  aria-\*, tabindex, disabled, href) and the first 60 characters of the
  element's text. The `value` attribute is deliberately left out, because it
  holds what you typed into a form field, and `href` keeps only its path. The
  query string, where tokens usually live, is removed.

## What the extension writes

It writes to your page in two ways only:

- **Testing a fix.** During the audit, where a fix can be computed from measured
  values, which in practice means a contrast color, the extension sets that one
  CSS property on the element, runs that one rule again, and puts the attribute
  back exactly as it found it. An automated check in the project compares the
  page's markup before and after, byte for byte, and fails the build on any
  difference. Suggestions that depend on what the page means are never applied.
- **Showing where the problems are.** While the report is open, it draws
  numbered marks in its own container at the document root, without being
  asked: one for each problem to fix that is on screen when none is open, or
  the elements of the problem you open. Inspecting the tab order draws numbered
  marks the same way. The container is `aria-hidden`, adds nothing to the
  page's tab order and never touches the audited elements. Only its numbers and
  the arrow shown for an element off screen answer a click: a number opens its
  problem, element or stop in the panel, and the arrow scrolls the page to the
  element. None of them moves focus on the page. When the tab moves to a
  different page from the one audited, including another route of the same app,
  the marks are removed and nothing is drawn on that page. They come back only
  when the tab shows the audited page again, after going back to it or
  reloading it. Everything it drew is also
  removed when the panel closes and at the start of any audit.

What you type into a form field is never read, written or stored.

## Where it goes

Nowhere. It stays in the extension's own memory and in `chrome.storage.session`,
which Chrome keeps in memory and clears when you close the browser. That is what
lets the report survive Chrome putting the extension to sleep while you read it.

The one thing kept after the browser closes is the report language you picked in
the panel (`auto`, `en` or `pt-BR`) in `chrome.storage.local`. Nothing about the
pages you audit is kept.

The extension sends nothing to us or to anyone else: no telemetry, no error
reports, no uploads. The only requests it can cause are axe-core re-reading a
stylesheet the page has already loaded, from that page's own origin, because a
few of its rules need the stylesheet text. When a page's stylesheets come from
another origin the extension turns that off rather than fetch them, and says so
in the report.

axe-core, the rules engine, is packaged inside the extension and is never
downloaded. There is no remotely hosted code of any kind.

Nothing is sold, shared, transferred or used for advertising, and there is no
profiling or tracking.

## The debugger permission

Clicking the toolbar icon never attaches the debugger. It is attached only when
you press "Check keyboard" to follow the page's real keyboard focus order, which
needs genuine Tab keystrokes that only Chrome's debugger can produce, so the
extension attaches `chrome.debugger` to the tab **for the length of that check
and nothing else**. Chrome shows its own banner on the tab while it is attached.

The debugger is used for one thing: sending Tab and Shift+Tab. The page is read
through the same code the rest of the audit uses. The debugger is released
before the finished report is published, and an automated check in the project
fails the build if the report is ever published while it is still attached.

## Permissions, and why each one exists

- **activeTab**: grants access to the one tab you clicked on, and only after
  that click. The extension asks for no standing access to any site.
- **scripting**: injects the audit into that tab and draws the numbered marks
  described above while the report is open.
- **sidePanel**: shows the report beside the page.
- **storage**: `chrome.storage.session` for the single report described above,
  and `chrome.storage.local` for the report language you picked. Nothing else.
- **debugger**: the keyboard check, as described above.

The extension requests no host permissions.

## Children

The extension is a developer tool and is not directed at children.

## Changes

If this policy changes, the effective date above changes with it.

## Contact

marianacastrorc@gmail.com
