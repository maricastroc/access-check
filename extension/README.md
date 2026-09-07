# AccessCheck extension (prototype)

Audits the page you are already on — including pages behind a login, on localhost
or on staging, which the hosted scanner cannot reach. Nothing leaves the browser:
no network calls, no storage, no account.

It runs the same engine as the hosted scanner. `src/audit.ts` imports the audit
code from `src/lib/scan/` and only decides the order of the calls; there is no
second copy of any rule.

## Build and load

```bash
npm run build:extension
```

Then in Chrome:

1. open `chrome://extensions`
2. turn on **Developer mode** (top right)
3. **Load unpacked** → pick the `extension/dist` folder
4. open any page, click the AccessCheck icon in the toolbar

The report opens in a new tab. The click is what grants access to that one tab
(`activeTab`), so the extension never has standing permission to any site — the
install prompt asks for no host access at all.

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

## What it does not check

- **Focus path** — needs real Tab presses (`chrome.debugger` + CDP)
- **Mobile viewport** — needs viewport emulation
- **Reduced motion** — needs media emulation
- **Verified fixes** — the hosted flow applies each fix and re-runs the rule; that
  writes to the page, so this build does not do it
- **Lazy content** — the hosted flow scrolls the page first; this build does not
  touch the reader's scroll position, so content below the fold may be missed
- **iframes and closed shadow roots** — only the top frame is audited

Every one of these is listed in the report itself, and the result is marked
`partial`, so a reading from this build never poses as a full audit.
