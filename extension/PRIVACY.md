# AccessCheck extension — privacy policy

**Effective 8 September 2026.** This policy covers the AccessCheck browser
extension. The hosted scanner at the AccessCheck website is a separate product
with its own accounts and storage; this policy is only about the extension.

## The short version

The extension reads the page you ask it to audit, in your browser, and shows you
what it found. Nothing it reads leaves your browser. There is no account, no
analytics and no tracking.

## What the extension reads

When you click the AccessCheck icon on a tab, and only then, it reads that one
tab:

- **The page's DOM** — elements, attributes, computed styles and positions, so
  the rules can decide what passes and what fails.
- **A screenshot of the visible viewport** — one JPEG, used to draw the markers
  in the report's Evidence section.
- **CSS selectors** for the elements a finding refers to, so you can locate them.
- **A short, abbreviated HTML snippet** for each occurrence. It is rebuilt from a
  fixed list of attributes (id, class, type, role, name, alt, title, placeholder,
  aria-\*, tabindex, disabled, href). The `value` attribute is deliberately left
  out, because it holds what you typed, and `href` keeps only its path — the
  query string, where tokens usually live, is removed.

## Where it goes

Nowhere. It stays in the extension's own memory and in `chrome.storage.session`,
which Chrome keeps in memory and clears when you close the browser. That is what
lets the report survive Chrome putting the extension to sleep while you read it.

The extension sends nothing to us or to anyone else — no telemetry, no error
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

The expanded audit walks the page's real keyboard focus order. Doing that needs
genuine Tab keystrokes, which only Chrome's debugger can produce, so the
extension attaches `chrome.debugger` to the tab **for the length of that walk
and nothing else**. Chrome shows its own banner on the tab while it is attached.

The debugger is used for one thing: sending Tab and Shift+Tab. The page is read
through the same code the rest of the audit uses. The debugger is released
before the finished report is published, and an automated check in the project
fails the build if the report is ever published while it is still attached.

## Permissions, and why each one exists

- **activeTab** — grants access to the one tab you clicked on, and only after
  that click. The extension asks for no standing access to any site.
- **scripting** — injects the audit into that tab and draws the temporary
  highlight when you ask to locate an element.
- **sidePanel** — shows the report beside the page.
- **storage** — `chrome.storage.session` only, for the single report described
  above.
- **debugger** — the keyboard focus walk, as described above.

The extension requests no host permissions.

## Children

The extension is a developer tool and is not directed at children.

## Changes

If this policy changes, the effective date above changes with it.

## Contact

marianacastrorc@gmail.com
