import type { Message } from "./shape";

export const en = {
  "unit.stop": { one: "{count} stop", other: "{count} stops" },
  "unit.detectedControl": { one: "{count} detected control", other: "{count} detected controls" },
  "unit.styleSheet": { one: "{count} stylesheet", other: "{count} stylesheets" },
  "unit.mediaFile": { one: "{count} media file", other: "{count} media files" },
  "results.findingsAndElements": "{findings} \u00b7 {elements}",
  "unit.finding": { one: "{count} finding", other: "{count} findings" },
  "unit.element": { one: "{count} element", other: "{count} elements" },
  "unit.elementNoun": { one: "element", other: "elements" },
  "unit.and": "and",

  "privacy.metaTitle": "Privacy \u2014 AccessCheck extension",
  "privacy.metaDescription": "What the AccessCheck browser extension reads, and where it goes.",
  "meta.title": "AccessCheck: measure, locate and trace every accessibility barrier",
  "meta.description":
    "Paste a web address. AccessCheck opens the page in a real browser, runs axe-core (WCAG levels A and AA) plus keyboard, mobile and vision passes, and returns each finding tied to the element that caused it, with a fix tested on a copy of the page.",
  "nav.skipToContent": "Skip to content",
  "nav.howItWorks": "How it works",
  "nav.checks": "Checks",
  "nav.evidenceLens": "Evidence Lens",
  "nav.history": "History",
  "nav.account": "Account",
  "nav.signOut": "Sign out",
  "layer.markersShort": "Markers",
  "capture.noMarkersLanded":
    "No marker fits this screenshot: every affected element sits outside the captured area, or has no visible box.",
  "nav.signIn": "Sign in",
  "language.label": "Language",
  "language.followBrowser": "Browser default",

  "api.site.noAddress": "No web address was provided. Enter a site address and try again.",
  "api.site.rateLimited":
    "Too many site audits in a short time. Please wait a few minutes and try again.",
  "api.site.unavailable":
    "Site audits are temporarily unavailable. Please audit a single page instead, or try again later.",
  "api.site.disabled":
    "Site audits aren't available right now. Please audit a single page instead.",
  "audit.live.criterion": "WCAG 4.1.3 \u00b7 Status Messages",
  "audit.live.invalidTitle": {
    one: "{count} live region has an invalid aria-live value",
    other: "{count} live regions have an invalid aria-live value",
  },
  "audit.live.invalidDesc":
    "aria-live must be polite, assertive or off. Any other value is ignored, so screen readers never announce updates to the region.",
  "audit.live.invalidFix":
    'Set aria-live to "polite" for routine updates or "assertive" for urgent ones.',
  "audit.live.hiddenTitle": {
    one: "{count} live region is hidden and can't announce",
    other: "{count} live regions are hidden and can't announce",
  },
  "audit.live.hiddenDesc":
    "The region is removed from the accessibility tree (display:none, visibility:hidden or aria-hidden), so updates written into it are never announced. Note this is different from the valid visually-hidden pattern, which keeps the node in the tree.",
  "audit.live.hiddenFix":
    "Keep the live region in the accessibility tree: use a clip or screen-reader-only pattern instead of display:none, and remove aria-hidden from it.",
  "audit.live.mutedTitle": {
    one: '{count} alert is muted with aria-live="off"',
    other: '{count} alerts are muted with aria-live="off"',
  },
  "audit.live.mutedDesc":
    'An element with role="alert" is meant to interrupt, but aria-live="off" silences it. The two contradict each other, so nothing is announced.',
  "audit.live.mutedFix":
    'Remove aria-live="off" from the alert (role="alert" is assertive by default).',

  "audit.motion.criterion": "WCAG 2.3.3 \u00b7 Animation from Interactions",
  "audit.motion.title": {
    one: "{count} element keeps animating under reduced motion",
    other: "{count} elements keep animating under reduced motion",
  },
  "audit.motion.desc": {
    one: "With prefers-reduced-motion: reduce set, {count} element still ran a looping or long, non-trivial animation. Motion the user asked to avoid can trigger nausea, dizziness or migraines for people with vestibular disorders.",
    other:
      "With prefers-reduced-motion: reduce set, {count} elements still ran a looping or long, non-trivial animation. Motion the user asked to avoid can trigger nausea, dizziness or migraines for people with vestibular disorders.",
  },
  "audit.motion.fix":
    "Wrap non-essential animation in @media (prefers-reduced-motion: reduce) and turn it off or shorten it there. For example, use animation: none, or a brief opacity fade instead of movement.",

  "audit.target.criterion": "WCAG 2.5.8 \u00b7 Target Size (Minimum)",
  "audit.target.title": {
    one: "{count} touch target is smaller than 24\u00d724px",
    other: "{count} touch targets are smaller than 24\u00d724px",
  },
  "audit.target.desc": {
    one: "{count} interactive control is below the 24\u00d724 CSS pixel minimum and sits too close to another target to earn the spacing exception. Small, crowded targets are hard to hit for people with motor impairments or on touch screens.",
    other:
      "{count} interactive controls are below the 24\u00d724 CSS pixel minimum and sit too close to another target to earn the spacing exception. Small, crowded targets are hard to hit for people with motor impairments or on touch screens.",
  },
  "audit.target.fix":
    "Grow each control to at least 24\u00d724px, or add enough spacing so a 24px circle centred on it clears its neighbours (padding on the control usually does both).",

  "audit.liveRegionHidden":
    "The region is removed from the accessibility tree (display:none, visibility:hidden or aria-hidden), so screen readers never announce it.",
  "audit.liveRegionFix":
    "Keep the live region in the accessibility tree: use a clip or screen-reader-only pattern instead of hiding it.",
  "audit.liveRegionContradiction": "The two contradict each other, so nothing is announced.",
  "audit.targetSizeFix":
    "Grow each control to at least 24\u00d724px, or add enough spacing around it that a 24px target fits without overlapping its neighbours.",
  "audit.motionFix":
    "Wrap non-essential animation in @media (prefers-reduced-motion: reduce) and turn it off or shorten it there.",

  "scanFail.browserUnavailable":
    "The browser we use to open the page stopped responding before the audit could run.",
  "scanFail.browserSlow":
    "The browser we use to open the page took too long to start. Please try again.",
  "scanFail.unreachable": "The page could not be reached.",
  "scanFail.timeout": "The accessibility audit could not finish on this page in time.",
  "scanFail.generic": "Scan failed.",
  "scanFail.httpError":
    "The page returned an error (HTTP {status}), so we couldn't audit it. Check the address and try again.",
  "scanFail.navigationTimeout": "The page took longer than {seconds}s to respond.",
  "scanFail.engineMissing":
    "The audit engine could not be loaded into the page ({path}). Build it with `npm run build:engine`. {detail}",
  "scanFail.engineVersion":
    "The audit engine in the page reports version {found}, this driver needs {needed}. Rebuild it with `npm run build:engine`.",

  "home.lens.sharedColor": "Contrast finding, another element sharing this color",
  "home.lens.locatedElement": "Contrast finding, located element",
  "home.lens.locatedVerified": "Located element verified",
  "home.example.headingSkip": "Heading level skips",

  "api.internal": "Something went wrong on our side. Please try again.",
  "api.badRequest": "We couldn't read that request. Please reload the page and try again.",
  "api.noAddress": "No web address was provided. Enter a page address and try again.",
  "api.rateLimited": "Too many audits in a short time. Please wait about a minute and try again.",
  "api.invalidAddress": "That doesn't look like a valid web address. Check it and try again.",
  "api.tooSlow":
    "This page took too long to finish. Try a single, lighter page instead of a large home page.",
  "api.auditFailed": "We couldn't audit this page. Please try another web address.",

  "report.passedChecks": "Passed checks",
  "report.priorityProjection": "Priority projection",
  "report.current": "Current",
  "report.estimated": "Estimated",
  "report.actionPlan": "Action plan",

  "md.reportTitle": "Accessibility report: {name}",
  "md.reportTitleDash": "Accessibility report \u2014 {name}",
  "md.url": "URL",
  "md.scoreLabel": "Score",
  "md.priorityScore": "Internal priority score",
  "md.priorityNote": "(priority, not a WCAG conformance grade)",
  "md.elementsScanned": "Elements scanned",
  "md.generated": "Generated",
  "md.whereScoreCanGo": "Where the score can go",
  "md.currentScore": "Current internal priority score: **{score} / 100**.",
  "md.colIfYouFix": "If you fix",
  "md.colElements": "Elements",
  "md.colScoreRises": "Score rises to",
  "md.manualOutside": {
    one: "{count} manual-review item sits outside the score.",
    other: "{count} manual-review items sit outside the score.",
  },
  "md.nonLinear":
    " Each row is the score after fixing that severity on its own; the score is non-linear, so fixing more than one recovers less than the rows added together.",
  "md.wcagReading": "WCAG reading",
  "md.failsBy": "fails by {criteria}",
  "md.noAFailures": "no automated level-A failures",
  "md.noAAFailures": "no automated level-AA failures",
  "md.aaaNote": "not evaluated. AccessCheck runs A and AA (WCAG 2.0/2.1/2.2)",
  "md.findings": "Findings",
  "md.needsManualReview": "Needs manual review",
  "md.whereLabel": "Where",
  "md.howToCheck": "How to check",
  "md.checksPassed": "Automated checks passed ({count})",
  "md.passedChecks": "Passed checks ({count})",
  "md.footer":
    "_Fixes are applied and re-audited in a sandbox copy; the audited site is not altered. The score is an internal priority measure, not a declaration of conformance._",
  "md.bestPracticeNote": "**Best practice** (not a WCAG success criterion)",
  "md.passLabel": "Pass",
  "md.affected": "Affected",
  "md.elementsLabel": "Elements",
  "md.measuredLabel": "Measured",
  "md.minimumAA": "minimum AA {required}:1",
  "md.fixReaches": "fix reaches {ratio}:1",
  "md.impact": "Impact",
  "md.suggestedFix": "Suggested fix",
  "md.setProp": "Set `{prop}` to {hex}.",
  "md.andMore": "(+{count} more)",
  "md.summary": "Summary",
  "md.colCritical": "Critical",
  "md.colSerious": "Serious",
  "md.colModerate": "Moderate",
  "md.colMinor": "Minor",
  "md.colPassed": "Passed",
  "md.fixFirst": "Fix First",
  "md.fixFirstLine": "**{title}** \u2014 impact {impact}, effort {effort}",
  "md.violations": "Violations",
  "md.severityHeading": "{severity} ({count})",
  "md.selectorLabel": "Selector",
  "md.occurrencesLabel": "Occurrences",
  "md.verifiedTag": "\u2705 Verified \u2014 re-scan passes",
  "md.needsReviewTag": "\u26a0\ufe0f Needs review \u2014 re-scan still flags",
  "md.resolvesElements": {
    one: "Resolves {count} element",
    other: "Resolves {count} elements",
  },
  "md.keyboardHeading": "Keyboard & focus",
  "md.tracedStops": {
    one: "Traced {count} focus stop",
    other: "Traced {count} focus stops",
  },
  "md.reachableCounts": "{reachable}/{total} interactive elements reachable by keyboard",
  "md.noInteractive": "no interactive controls detected",
  "md.severityLabel": "Severity",
  "md.fixLabel": "Fix",
  "md.contextsHeading": "Responsive & dynamic",
  "md.viewportChecked": "{width}px viewport",
  "md.openedStates": {
    one: "{count} opened state",
    other: "{count} opened states",
  },
  "md.rescannedBeyond": "Re-scanned beyond the initial desktop load \u2014 checked {checked}.",
  "md.onlyAtWidth": "Only at {width}px",
  "md.noViolations": "No automated violations detected. \ud83c\udf89",
  "md.noKeyboard": "No keyboard or focus issues detected. \ud83c\udf89",
  "md.noContexts": "No new violations surfaced in these contexts. \ud83c\udf89",
  "md.manualNote": "Automated testing couldn't determine these \u2014 confirm them by hand.",
  "md.noFailures": "No automated failures on this page. This is coverage, not WCAG conformance.",
  "md.manualOutsideScore":
    "Automated testing couldn't decide these, so confirm them by hand. They stay outside the score.",

  "diff.noneCleared": "No rules cleared since the last audit.",
  "diff.cleared": "Cleared",
  "diff.newOrWorse": "New or worse",
  "diff.andMore": "+ {count} more",
  "diff.noneWorse": "No new rules flagged. Nothing got worse.",

  "preview.stillFlagged":
    "The calculated pair reaches the minimum, but the located element's live re-audit still flags it. The real background is probably an image, gradient or overlapping layer, so this sampled solid color isn't the true background.",
  "preview.noColorReaches": "No color change alone reaches the minimum on this hue pair.",

  "scanError.hint.invalidUrl": "Check the address and try again.",
  "scanError.hint.blockedUrl": "Only public web pages can be audited.",
  "scanError.hint.rateLimited": "Wait a moment before starting another audit.",
  "scanError.hint.navigationTimeout": "The site may be slow, or it may block automated browsers.",
  "scanError.hint.navigationFailed": "Check the address, or the site may be offline.",
  "scanError.hint.httpError": "The address may be wrong, removed, or behind a login.",
  "scanError.hint.auditFailed":
    "This page is unusually heavy. Try one specific page instead of the home page.",
  "scanError.hint.browserUnavailable": "Give it a moment and try again.",
  "scanError.hint.timeout":
    "This page is unusually heavy. Try one specific page instead of the home page.",
  "scanError.hint.interrupted": "The connection dropped during the audit. Try again.",
  "scanError.hint.internal": "Something went wrong on our side. Try again.",

  "scanError.message.invalidUrl": "We couldn't read that address.",
  "scanError.message.blockedUrl": "That address can't be audited.",
  "scanError.message.rateLimited": "Too many audits in a short time. Try again in a minute.",
  "scanError.message.navigationTimeout": "The page took too long to respond.",
  "scanError.message.navigationFailed": "We couldn't reach the page.",
  "scanError.message.httpError":
    "The page returned an error, so we couldn't audit it. Check the address and try again.",
  "scanError.message.auditFailed": "We couldn't finish the audit on this page.",
  "scanError.message.browserUnavailable":
    "We couldn't start the browser used to open the page. Please try again.",
  "scanError.message.timeout": "The audit ran out of time on this page.",
  "scanError.message.interrupted": "The audit stopped before finishing.",
  "scanError.message.internal": "The audit stopped before it could finish. Please try again.",

  "scanWarning.screenshotUnavailable": "The screenshot could not be taken in time.",
  "scanWarning.fixDetailsSkipped":
    "Some findings show general guidance instead of a specific suggested fix.",
  "scanWarning.markersSkipped": "The markers could not be placed on the screenshot.",
  "scanWarning.contentUnsettled": "The page was still loading when the audit ran.",
  "scanWarning.verificationSkipped": "Fixes were not tested on a copy of the page this time.",
  "scanWarning.auditsSkipped": "The target-size, motion and live-region checks were skipped.",
  "scanWarning.keyboardSkipped": "The keyboard and focus-order check was skipped.",
  "scanWarning.lazyContentSkipped":
    "Content that only renders on scroll was not loaded before the audit.",
  "scanWarning.walkChangedPage": "Tabbing through the page opened content that stayed open.",
  "scanWarning.contextsSkipped": "The mobile and dynamic-state check was skipped.",
  "scanWarning.streamInterrupted": "The audit was cut short before every check finished.",
  "scanWarning.crossOriginAssets":
    "Some styles and media came from another origin and could not be read.",

  "blocked.chromePages": "Chrome does not let any extension run on its own pages.",
  "blocked.extensionPage": "This is an extension page, not a web page.",
  "blocked.webStore": "Chrome blocks extensions on the Web Store.",
  "blocked.builtinViewer": "Chrome's built-in viewer has no page for the audit to read.",
  "blocked.localFile":
    "Local files need the extension's file access turned on in chrome://extensions.",
  "blocked.noAddress": "This tab has no address the audit can read.",

  "background.wokeUp":
    "Chrome put the extension to sleep before the audit finished, so nothing was measured. Run it again.",
  "background.pageUnreadable": "The page could not be read.",
  "background.auditEmpty": "The audit returned nothing.",
  "background.permissionLapsed":
    "This tab moved on, so the one-tab permission lapsed. Click the AccessCheck icon on the page to audit it again.",
  "background.otherTab":
    "Auditing another tab needs a click on the AccessCheck icon there: that click is what grants access to it.",
  "background.nothingAudited": "Nothing has been audited in this tab yet.",
  "background.tabUnreachable": "This tab moved on, so the page can no longer be reached from here.",
  "background.markupFailed": "The page could not be marked up.",

  "deep.cancelled":
    "You stopped it, so the focus path was not walked. The rest of this report is unchanged.",
  "deep.cancelledPlain": "The deep audit was cancelled, so the focus path was not walked.",
  "deep.alreadyAttached":
    "Another debugger is attached to this tab — usually DevTools. Close it and run the deep audit again.",
  "deep.notDebuggable":
    "Chrome does not allow debugging this page, so the focus path cannot be walked here.",
  "deep.attachRefused": "Chrome refused to attach the debugger: {reason}",
  "deep.tabMovedOn":
    "The tab moved on while the focus path was being walked, so the deep audit stopped.",
  "deep.unfinished": "The deep audit could not finish: {reason}",
  "deep.notReleased":
    "Chrome would not release the debugger. The banner on the tab may stay until you reload it.",

  "engine.missing":
    "The AccessCheck audit engine was not injected into this page. Reload the extension and try again.",
  "engine.versionMismatch":
    "The audit engine in the page reports version {found}, this build needs {needed}.",

  "warning.keyboardSkipped":
    'The focus path was not walked. Use "Walk the focus path now" to send real Tab presses through the page.',
  "warning.keyboardFailed": "The focus path was not walked. {reason}",
  "warning.lazyContent":
    "Content that only renders once you scroll to it was not loaded, so anything below the fold was not read. The expanded audit walks the page first; this reading did not.",
  "warning.contextsSkipped":
    "The mobile-viewport pass needs viewport emulation, not available in this build.",
  "warning.auditsSkipped":
    "The reduced-motion check needs media emulation, not available in this build.",
  "warning.verificationSkipped":
    "Fixes are not tested here: this build never writes to the audited page.",
  "warning.walkChangedPage":
    "Typing Tab through this page opened content that stayed open — a menu, a panel or a suggestion list. The rules had already read the page by then, so auditing again can give a slightly different reading of the same page.",
  "warning.contentUnsettled":
    "The page was still changing after six seconds of waiting, so the rules read a moving target. Findings from a page that has not settled are not reliable, and will differ between runs.",
  "warning.crossOrigin":
    "{assets} on this page {verb} from another origin, which this build is not allowed to fetch. Rules that read those files — the orientation-lock check — report as needing review instead of passing. Everything read from the page itself is unaffected.",
  "warning.crossOriginComes": "comes",
  "warning.crossOriginCome": "come",

  "caveat.contentUnsettled": "page still changing",
  "caveat.walkChangedPage": "the walk opened content",
  "caveat.crossOriginAssets": "some styles unreadable",
  "caveat.screenshotUnavailable": "no screenshot",
  "caveat.markersSkipped": "no markers on the screenshot",
  "caveat.fixDetailsSkipped": "fix details missing",
  "caveat.streamInterrupted": "reading interrupted",

  "coverage.partialChecks": {
    one: "Partial coverage · {count} check unavailable",
    other: "Partial coverage · {count} checks unavailable",
  },
  "coverage.partialCaveat": "Partial coverage · {caveat}",
  "coverage.complete": "Every check this build runs completed",

  "focusPath.none": "No keyboard-focusable controls were found on this page.",
  "focusPath.full": "Walked the full tab order: {stops} across {controls}.",
  "focusPath.firstOnly": {
    one: "Checked the first {stops} of {controls}.",
    other: "Checked the first {stops} of {controls}.",
  },
  "focusPath.notFromTop":
    "Partial: the walk could not be taken back to the first control, so these {stops} start somewhere inside the tab order.",
  "focusPath.leftoverSome": {
    one: "the remaining {count} control was not evaluated",
    other: "the remaining {count} controls were not evaluated",
  },
  "focusPath.leftoverNone": "it may not have reached the end of the tab order",
  "focusPath.stoppedByCap": "Partial: the walk reached its {stops}-stop limit, so {leftover}.",
  "focusPath.stoppedByTimeout": "Partial: the walk ran out of time after {stops}, so {leftover}.",
  "focusPath.stoppedByOpaque":
    "Partial: focus moved into an iframe or a shadow root, which this build cannot see into, so {leftover}.",
  "focusPath.stoppedByTrap": "Partial: focus was trapped at stop {stops}, so {leftover}.",

  "scope.stillMissing":
    "The mobile viewport, reduced motion and verified fixes are still not checked here, so this is not a full audit.",
  "scope.quickKicker": "Quick audit score",
  "scope.currentTabKicker": "Current-tab audit score",
  "scope.preliminaryLead": "Preliminary result",
  "scope.skippedNote":
    "The focus path was not verified, so nothing here can speak for keyboard use. {why} {rest}",
  "scope.partialBadge": "Includes keyboard focus path · partial",
  "scope.partialNote":
    "The focus path could not be taken back to the first control, so these {stops} stops start somewhere inside the page rather than at the beginning of the tab order. {rest}",
  "scope.truncatedBadge": "Includes keyboard focus path · stopped at {stops}",
  "scope.truncatedNote":
    "The focus path stopped early after {stops} stops, so anything past that point was never reached. {rest}",
  "scope.walkedBadge": "Includes keyboard focus path",
  "scope.walkedNote": "The focus path was walked to the end with real Tab presses. {rest}",

  "summary.scope": " among the checks that ran",
  "summary.bestPractice": {
    one: "{count} best-practice recommendation",
    other: "{count} best-practice recommendations",
  },
  "summary.manualReview": {
    one: "{count} manual-review item",
    other: "{count} manual-review items",
  },
  "summary.remaining": {
    one: " {parts} remains, outside the score.",
    other: " {parts} remain, outside the score.",
  },
  "summary.critical": {
    one: "Strong foundation, but {count} critical finding blocks WCAG level AA. Fix it first.",
    other: "Strong foundation, but {count} critical findings block WCAG level AA. Fix them first.",
  },
  "summary.serious": {
    one: "No critical blockers{scope}, but {count} serious finding still makes the page harder to use for people who rely on assistive technology.",
    other:
      "No critical blockers{scope}, but {count} serious findings still make the page harder to use for people who rely on assistive technology.",
  },
  "summary.moderatePartial": "Only moderate findings among the checks that ran.",
  "summary.moderate": "Solid result. Only moderate findings are left to polish.",
  "summary.cleanPartial":
    "No scored WCAG failures in the checks that ran. Some checks did not run here, so this is not a clean bill of health.",
  "summary.cleanNoFailures": "No scored WCAG failures were found.",
  "summary.excellent": "Excellent. No automated findings on this page.",

  "finding.kind.keyboard": "Keyboard",
  "finding.kind.targetSize": "Target size",
  "finding.kind.reducedMotion": "Reduced motion",
  "finding.kind.liveRegions": "Live regions",
  "finding.kind.context": "Responsive & dynamic",
  "finding.kind.bestPractice": "Best practice",
  "finding.contextOnly":
    "Found only in this context ({where}). It does not fail on the first desktop load.",

  "review.generic.how":
    "Automated testing couldn't decide this one, so it needs a person to confirm.",
  "review.generic.s1": "Inspect each affected element in your browser's developer tools",
  "review.generic.s2": "Check it against the WCAG success criterion listed here",
  "review.generic.s3": "Confirm the intent holds for screen-reader and keyboard users",

  "review.contrast.how":
    "The checker couldn't read what's behind this text. It's usually a background image, a gradient, a see-through layer, or an element sitting on top.",
  "review.contrast.s1": "Look at the text over its real, rendered background",
  "review.contrast.s2": "Sample the text and background colors with a color picker",
  "review.contrast.s3":
    "Confirm at least 4.5:1 (3:1 for large text, meaning 24px or larger, or 18.66px bold or larger)",

  "review.linkInText.how":
    "Links inside a block of text must be tellable apart without relying on color alone.",
  "review.linkInText.s1":
    "Give the link a cue that isn't color, such as an underline (the safest option)",
  "review.linkInText.s2":
    "If it's color-only, confirm at least 3:1 contrast against the surrounding text",
  "review.linkInText.s3": "Confirm a visible change on hover and on keyboard focus",

  "review.scrollable.how":
    "This region scrolls, so keyboard users must be able to reach and scroll it.",
  "review.scrollable.s1": "Tab to the region and try scrolling with the arrow keys",
  "review.scrollable.s2": 'If it isn\'t reachable, add tabindex="0" to the scroll container',
  "review.scrollable.s3": "Make sure the content inside is still reachable in a sensible order",

  "review.nameMismatch.how":
    "The visible label and the accessible name differ, which breaks voice-control users who say what they see.",
  "review.nameMismatch.s1": "Compare the visible text with the aria-label / aria-labelledby",
  "review.nameMismatch.s2":
    "Ensure the accessible name contains the visible text, in the same order",
  "review.nameMismatch.s3":
    "Prefer dropping the aria-label and letting the visible text be the name",

  "review.frame.how": "This page embeds an <iframe> axe can't see into.",
  "review.frame.s1": "Give the <iframe> a short, descriptive title attribute",
  "review.frame.s2": "Audit the framed page separately. It has its own accessibility",

  "review.tableHeader.how": "axe couldn't confirm this table header is tied to its data cells.",
  "review.tableHeader.s1": "Confirm it's a real data table, not a layout table",
  "review.tableHeader.s2": "Give each header a scope (col/row), or link cells with headers/id",

  "review.autocomplete.how": "The autocomplete value couldn't be validated automatically.",
  "review.autocomplete.s1": "Check the field's purpose matches a valid autocomplete token",
  "review.autocomplete.s2": "Use standard tokens (name, email, tel, etc.) so browsers can autofill",

  "review.orientation.how": "The page may lock content to a single screen orientation.",
  "review.orientation.s1": "Rotate the device or emulator between portrait and landscape",
  "review.orientation.s2": "Confirm content and functionality survive both orientations",

  "review.pAsHeading.how": "A paragraph is styled to look like a heading (bold or large).",
  "review.pAsHeading.s1": "If it introduces a section, make it a real <h1>\u2013<h6>",
  "review.pAsHeading.s2": "If it's just emphasized text, this one is safe to dismiss",

  "review.nested.how":
    "An interactive control looks nested inside another (e.g. a button inside a link).",
  "review.nested.s1": "Confirm there aren't focusable controls inside other controls",
  "review.nested.s2": "Flatten the markup so each control stands on its own",

  "vision.normal": "Normal",
  "vision.normalTitle": "Normal, no vision filter",
  "vision.deuteranopia": "Deuteranopia",
  "vision.deuteranopiaTitle": "Deuteranopia (red-green color blindness)",
  "vision.protanopia": "Protanopia",
  "vision.protanopiaTitle": "Protanopia (red-green color blindness)",
  "vision.tritanopia": "Tritanopia",
  "vision.tritanopiaTitle": "Tritanopia (blue-yellow color blindness)",
  "vision.lowVision": "Low vision",
  "vision.lowVisionTitle": "Low vision (reduced sharpness and contrast)",
  "vision.grayscale": "Grayscale",
  "vision.grayscaleTitle": "Grayscale (no color)",
  "vision.short.deut": "Deut.",
  "vision.short.gray": "Gray",
  "home.lens.frameLabel": "Screenshot \u00b7 scale 43%",
  "vision.rail": "Vision",
  "layer.rail": "Overlay",
  "layer.markers": "Issue markers",
  "layer.markersTitle": "Show the issue markers on the screenshot",
  "layer.focus": "Focus path",
  "layer.focusTitle": "Show the keyboard focus order",
  "layer.none": "No overlay",
  "layer.noneTitle": "Hide the overlay",

  "capture.defaultRender": "default render \u00b7 no vision filter",
  "capture.simulating": "simulating {mode}",

  "home.md.filename": "accesscheck-aurora-coffee-com.md",
  "home.md.line1": "## aurora-coffee.com: 53/100",
  "home.md.line2": "| severity | findings | elements |",
  "home.md.line3": "| serious  | 1 | 7 |",
  "home.md.line4": "| moderate | 2 | 2 |",
  "home.md.line5": "### Fix first",
  "home.md.line6": "1. color-contrast \u00b7 1.4.3 \u00b7 verified",

  "results.focusPathStops": "focus-path stops",
  "results.manualReviewItems": {
    one: "{count} manual-review item \u00b7",
    other: "{count} manual-review items \u00b7",
  },
  "capture.evidenceLabel":
    "High-resolution evidence \u00b7 {width} \u00d7 {height} \u00b7 scale {scale}%",
  "capture.contextual": "Contextual capture \u00b7 {width} \u00d7 {height} \u00b7 scale {scale}%",
  "capture.announceContextual":
    "Showing the affected element at full resolution. Scroll the capture to see around it.",
  "capture.announceOverview": "Showing the overview capture.",
  "capture.backToOverview": "Back to the whole page",
  "capture.openEvidence": "See the evidence",
  "capture.readOnEvidence":
    "This overview is half-scale, for finding your way around. Open a marker to read the evidence at full resolution.",
  "capture.markerHint": "Select a marker to open its full-resolution evidence.",
  "detail.sharedColorPair": {
    one: "{count} occurrence shares this detected colour pair.",
    other: "{count} occurrences share this detected colour pair.",
  },
  "detail.moreSelectors": "+{count} more",
  "capture.overviewLabel": "Whole page \u00b7 {width} \u00d7 {height} \u00b7 scale {scale}%",
  "capture.overviewPartialLabel":
    "Whole page, partial \u00b7 {width} \u00d7 {height} \u00b7 scale {scale}%",
  "capture.announceOverviewScroll":
    "Showing the whole page. Scroll the capture to read further down.",
  "capture.partialTitle": "This overview stops short of the end of the page",
  "capture.partialBody":
    "It reaches {captured}px of the {total}px this page is tall. Everything below that was audited, but is not in this image.",
  "capture.partialWhyHeight": "The page is taller than the {limit}px an overview can hold.",
  "capture.partialWhyTiles": "The page needs more blocks than an overview can hold.",
  "capture.partialWhyBytes": "The blocks reached the weight an overview may take.",
  "capture.partialWhyTime": "The capture reached the time an overview may take.",
  "capture.partialWhyError": "The page stopped answering while the last blocks were taken.",
  "capture.partialCrops":
    "Findings further down keep their own full-resolution crops \u2014 open one from the list to see it.",
  "capture.overviewGrew":
    "The page grew while it was being photographed, so the last block may not line up with what you see now.",
  "panel.tileAlt": "{url}, from {from}px to {to}px down the page",
  "capture.evidenceShared": "shown in a capture taken for a nearby element",
  "capture.frameLabel": "Screenshot \u00b7 {width} \u00d7 {height} \u00b7 scale {scale}%",
  "capture.shownOnScreenshot": "{count} shown on the screenshot",
  "capture.onScreenshot": "\u00b7 on the screenshot",
  "detail.elementsAffected": {
    one: "element affected",
    other: "elements affected",
  },
  "provenance.engine": "Headless Chromium \u00b7 axe-core with WCAG A & AA rules",
  "provenance.viewportNote": " \u00b7 screenshot taken at {viewport}",
  "provenance.finishedIn": " in {seconds}s",
  "provenance.finishedInStandalone": " \u00b7 finished in {seconds}s",
  "provenance.sandboxNote":
    "Fixes are applied and reverted on a copy, so the audited site is never altered.",
  "report.wcagDependsOn": {
    one: "The score is our own priority measure, not a pass or fail for WCAG. Meeting WCAG also depends on the {count} manual-review item listed on page 3.",
    other:
      "The score is our own priority measure, not a pass or fail for WCAG. Meeting WCAG also depends on the {count} manual-review items listed on page 3.",
  },
  "home.lens.frameLabelFull":
    "Evidence Lens \u00b7 aurora-coffee.com \u00b7 1200 \u00d7 800 \u00b7 scale 43%",

  "capture.notCaptured": "Not captured yet",
  "capture.notAvailable": "Not available",
  "capture.siteAuditNote": "The site audit reads every page without stopping to photograph them.",
  "capture.failed": "The screenshot could not be taken this time.",
  "capture.runFullNote":
    "The findings for this page are complete. Run the full audit to add the screenshot, the issue markers and the focus path.",
  "capture.unaffected":
    "The findings for this page are unaffected \u2014 only the capture is missing.",
  "capture.runFull": "Run full audit",
  "capture.tryAgain": "Try again",
  "capture.collapsed": "Screenshot collapsed",
  "capture.beingTaken": "Screenshot \u00b7 being taken",
  "capture.screenshot": "Screenshot",
  "capture.show": "Show screenshot",
  "capture.collapse": "Collapse screenshot",
  "capture.collapseShort": "Collapse",
  "capture.elementAndCode": "Element and code",

  "results.auditedMinutesAgo": "Audited {minutes} min ago",
  "results.auditedAt": "Audited {when}",
  "phase.preparing": "getting ready",
  "phase.loading": "opening the page",
  "phase.auditing": "running the checks",
  "phase.processing": "processing the results",
  "phase.finalizing": "finishing up",
  "results.scanningStatus": "Auditing {url}. Currently {phase}.",
  "report.roadmap.immediateTerm": "Immediate \u00b7 0\u20131 week",
  "report.roadmap.immediateTitle": "Resolve critical findings",
  "report.roadmap.immediateBody": {
    one: "Clear the {count} critical finding first. It weighs the most in the score.",
    other: "Clear the {count} critical findings first. They weigh the most in the score.",
  },
  "report.roadmap.shortTerm": "Short term \u00b7 2\u20134 weeks",
  "report.roadmap.shortTitle": "Address serious findings",
  "report.roadmap.shortBody": {
    one: "Work through the {count} serious finding across templates and shared components.",
    other: "Work through the {count} serious findings across templates and shared components.",
  },
  "report.roadmap.longTerm": "Long term \u00b7 1\u20133 months",
  "report.roadmap.longTitle": "Refine and re-audit",
  "report.roadmap.longBody":
    "Clear remaining moderate items, do the manual-review checks, and run the audit again.",
  "report.noModerate": "No moderate findings.",

  "report.phase.preparing": "Starting a browser and getting the page ready.",
  "report.phase.loading": "Opening the page and letting it finish loading.",
  "report.phase.auditing": "Running the WCAG checks on the loaded page.",
  "report.phase.processing": "Grouping findings and matching them to WCAG checkpoints.",
  "report.phase.finalizing": "Scoring and putting the report together.",
  "report.freshNote": "The report is built from a fresh audit of this page, run right now.",
  "report.buildFailed": "We couldn't build the report. Please try again.",
  "report.buildFailedTitle": "Couldn\u2019t build the report",
  "report.newAudit": "New audit",
  "report.fixFirst": "Fix first",
  "report.buildingStatus": "Building the report for {url}. {detail}",

  "report.wcagLevelsChecked": "WCAG levels checked",
  "report.internalScoreFooter": "Internal score \u00b7 not a conformance statement",
  "report.pageOf": "WCAG A & AA \u00b7 Page {page} / 3",
  "report.headerTitle": "Accessibility report \u00b7 {host}",
  "report.pagePassed": "The page passed",
  "report.automatedChecks": "automated checks",
  "report.passedLabel": "Passed",
  "report.auditDate": "Audit date",
  "report.auditDuration": "Audit duration",
  "report.elementsChecked": "Elements checked",
  "report.exportedTitle": "Exported accessibility report",
  "report.internalScore": "Internal priority score",
  "report.executiveSummary": "Executive summary",
  "report.priorityRoadmap": "Priority roadmap",
  "report.suggestedFix": "Suggested fix",
  "report.selector": "Selector",
  "report.elementsAffected": "Elements affected",
  "report.criterion": "Criterion",
  "report.backToResults": "Back to results",
  "report.savePdf": "Save PDF",
  "report.printOrSavePdf": "Print / Save as PDF",

  "results.reportView": "Report view",
  "results.exportMarkdown": "Export Markdown",
  "results.exportPdf": "Export PDF",
  "results.newAudit": "New audit",
  "results.viewFinding": "View finding",
  "results.findingsByPriority": "Findings \u00b7 by priority",
  "results.findingsCount": "Findings \u00b7 {count}",
  "chip.fails": "fails {sc}",
  "chip.noFailures": "no failures",
  "chip.notEvaluated": "not evaluated",
  "results.auditedJustNow": "Audited just now",
  "results.backToSite": "Back to site audit",
  "results.siteAudit": "Site audit",
  "results.reauditPage": "Re-audit this page",
  "results.reaudit": "Re-audit",
  "results.stepsNote": "These are the real steps AccessCheck runs, in the order they happen.",
  "results.partialReport": "Partial report",
  "results.partialNote":
    "The score reflects only what we could measure. Anything we skipped is listed below, not guessed.",

  "home.lens.locatedOccurrence": "Located occurrence",
  "home.lens.verifiedInSandbox": "Verified in sandbox",
  "home.lens.measurement": "Measurement",
  "home.lens.measuredLabel": "measured",
  "home.lens.minLabel": "vs min",
  "home.lens.shareThisColor": {
    one: "{count} element shares this color",
    other: "{count} elements share this color",
  },
  "home.lens.suggestedFix": "Suggested fix",
  "home.lens.sandbox": "Sandbox",
  "home.lens.before": "Before",
  "home.lens.after": "After",
  "home.lens.locate": "Locate",
  "home.lens.verify": "Verify",

  "history.deleteOneTitle": "Delete this audit?",
  "history.deleteOneBody":
    "This removes the saved report and its screenshot from your history. This can\u2019t be undone.",
  "history.deleteOne": "Delete this audit",
  "history.deleteAllTitle": "Clear your audit history?",
  "history.deleteAllBody":
    "This permanently deletes every saved audit and screenshot. This can\u2019t be undone.",
  "history.deleteAll": "Delete all audits",

  "stages.opening": "Opening the page and waiting for it to settle",
  "stages.rules": "Running the WCAG A and AA checks (axe-core)",
  "stages.testingFixes": "Testing fixes on a copy of the page",
  "stages.screenshot": "Taking the screenshot",
  "stages.keyboardMobile": "Keyboard and mobile checks",

  "site.upTo": "of up to {seconds}s",
  "site.findingPages": "Finding pages on {host}: {elapsed}s of up to {budget}s",
  "site.readingSitemap": "Reading the sitemap",
  "site.followingLinks": "Following the links on the home page",
  "site.choosingPages": "Choosing the pages to audit",
  "site.startFailed": "We couldn't start the site audit. Please try again.",
  "site.startFailedTitle": "Couldn\u2019t start the site audit",
  "site.crawlProgress": "Site audit progress: {done} of {total} pages audited",

  "form.addressLabel": "Website address to audit",
  "form.addressHint": "Enter a web address to audit, like example.com.",
  "form.whatToAudit": "What to audit",

  "login.title": "Sign in to AccessCheck",
  "login.github": "Sign in with GitHub",
  "login.google": "Sign in with Google",

  "results.couldNotOpen": "Couldn't open the page",
  "results.tryAnotherUrl": "Try another URL",
  "results.seeWhatWeAudit": "See what we can audit",
  "results.runAgainMoreTime": "Run again with more time",
  "results.quickFromSite": "Quick result from the site audit.",
  "results.tapMarker": "Tap a marker to open the finding it belongs to.",
  "results.noFailuresMobile":
    "No automated failures on this page. Some things still need a person to check, shown as manual-review items below.",
  "results.showOnScreenshot": "Show on screenshot",
  "results.takingScreenshot": "Taking the screenshot of the page.",
  "results.fullImpactNote": "Full impact, fix preview and verification are in the findings panel.",
  "results.selectFinding": "Select a finding to inspect its element and code.",

  "site.tryAnotherAddress": "Try another address",
  "site.auditJustThisPage": "Audit just this page",
  "site.listNote":
    "We build the list from the sitemap and the links we can reach, then audit each page.",

  "history.tryDifferentDomain":
    "Try a different domain, or clear the score filter to see everything again.",
  "history.runAudit": "Run an audit",
  "history.scoreUp": {
    one: "up {count} point since the previous audit",
    other: "up {count} points since the previous audit",
  },
  "history.scoreDown": {
    one: "down {count} point since the previous audit",
    other: "down {count} points since the previous audit",
  },
  "history.sortLabel": "Sort audits",
  "history.clearHistory": "Clear history",
  "history.backToHistory": "Back to history",
  "history.savedReport": "Saved report",
  "history.searchByDomain": "Search audits by domain",

  "report.sandboxApplied":
    "Applied and re-checked on a copy of the page. The audited site was not altered.",
  "report.whereScoreCouldGo": "Where the score could go",
  "report.projectionBody":
    "If the critical and serious findings were resolved, the internal priority score would rise to an estimated",
  "report.projectionTail":
    ". This is only a projection of the score, not a pass for WCAG. Meeting WCAG also depends on the moderate items and on",
  "report.accessibilityReport": "Accessibility report",
  "report.detailedFindings": "Detailed findings",
  "report.noSeriousOnPage":
    "No critical or serious automated failures on this page. Moderate items and manual review are on page 3.",
  "report.changesSinceLast": "Changes since last audit",
  "report.scoringModelUpdated": "Scoring model updated",
  "report.whatMoved": "What moved since {date}",
  "report.sectionTwo": "Section 02",

  "login.subtitle": "Save your audits and track each site\u2019s score over time.",
  "login.note":
    "No passwords. We use GitHub or Google only to confirm who you are. AccessCheck stays free without an account.",

  "wcagReading.notEvaluated": "Not evaluated. AccessCheck runs A and AA",
  "wcagReading.internalNote":
    "The score is an internal priority measure. WCAG conformance also depends on checks no automated tool decides alone.",
  "ratio.minAA": "{value} min AA",
  "ratio.fixedAt": "{value} fixed",
  "ratio.minAAWithFix": "min AA {required}:1 \u00b7 corrected {fixed}:1",
  "ratio.minAAShort": "min AA {required}:1",
  "ratio.ariaLabel": "Contrast {found} to 1, minimum {required} to 1",
  "ratio.ariaLabelFixed": ", fix reaches {fixed} to 1",
  "score.ariaLabel": "Internal priority score {score} out of 100",
  "home.cta.notConformance": "Internal priority score \u00b7 not a conformance statement",
  "score.ifYouFix": "If you fix these, the score rises to",

  "home.hero.standards": "axe-core \u00b7 WCAG 2.0 / 2.1 / 2.2 \u00b7 levels A and AA",
  "home.footerStandards": "axe-core \u00b7 Playwright \u00b7 WCAG A & AA",
  "home.cta.standards":
    "AccessCheck \u00b7 axe-core \u00b7 Playwright \u00b7 WCAG 2.0 / 2.1 / 2.2 levels A and AA",
  "home.lens.measureFound": "the measure found",
  "home.lens.exactSelector": "the exact selector",
  "home.lens.reauditedInCopy": "re-audited in a copy",
  "form.scopePage": "Page",
  "form.scopeSite": "Site",
  "home.hero.title":
    "Every barrier measured, located on the element, and tested before it's suggested.",
  "home.hero.passes": "+ keyboard, viewport and vision passes",
  "home.hero.body":
    "This is not another report. It is a visual inspector: paste a web address and every finding comes tied to the element that caused it, with the contrast ratio, the selector and a fix we test on a copy of the page.",
  "home.hero.lensNote":
    "Select a finding and its marker lights up. Click the marker and the details open: the screenshot, the measurement and the code in one place.",
  "home.lens.title": "See the barrier on the element that caused it",
  "home.lens.body":
    "Element, selector, measurement and diagnosis stay in one chain. Select a finding and its marker fills in. The located element is labeled with the ratio, and the others keep a dashed outline, so you can tell them apart without relying on color.",
  "home.lens.contrastStory":
    "The white text on the light-green button disappears for people with low vision, or for anyone in bright sunlight. And this is the checkout button.",
  "home.lens.sandboxNote": "Tested in a sandbox copy. aurora-coffee.com was not altered.",
  "home.form.noAccount": "No account, no extension, no change to the audited site",
  "home.form.exportNote": "Export as PDF or Markdown",
  "home.demo.roasted": "Roasted in Porto every Tuesday and shipped the same week.",

  "home.notSeal.kicker": "Not",
  "home.notSeal.body":
    "a conformance seal. It measures what automated tools can prove, and marks the rest for a human to review.",
  "home.mostRecent": "Most recent public audit \u00b7 internal priority score",
  "home.auditSite": "Audit site",
  "home.auditPage": "Audit page",
  "home.timing": "About 10 to 25 seconds per page",
  "home.quickExamples": "Quick examples:",
  "home.stage.open": "Open",
  "home.stage.locate": "Locate",
  "home.stage.verify": "Verify",
  "home.stage.browserReady": "Chromium \u00b7 axe-core injected \u00b7 content settled",
  "home.axeRules.kicker": "axe-core rules",
  "home.axeRules.note": "pass or fail, objectively",
  "home.axeRules.countLine1": "success criteria",
  "home.axeRules.countLine2": "checked automatically",
  "home.complementary.kicker": "complementary passes",
  "home.complementary.note": "what a tool can't judge alone",
  "home.complementary.countLine1": "passes beyond",
  "home.complementary.countLine2": "the static DOM",

  "results.checksPassedLabel": "automated checks passed",
  "results.manualReviewLabel": "manual-review items, with how to check",
  "results.needPersonReview": "need a person to review, listed below.",
  "results.noAutomatedFailures": "No automated failures on this page.",
  "results.checksPassedNote": "{passed} checks passed. This is not the same as WCAG conformance:",
  "results.manualReviewPending": {
    one: "{count} item still needs a person to review, listed below.",
    other: "{count} items still need a person to review, listed below.",
  },
  "results.noVisibleFocus": "no visible focus",
  "results.measuredNeeds": "{measured}:1 \u00b7 needs {required}:1",
  "results.fixArrow": "fix \u2192 {score}",
  "results.outsideScore": "outside the score",
  "results.runFullAuditNote":
    "the full audit to add the screenshot, keyboard checks and fix testing.",
  "results.siteAuditPassNote":
    "Site-audit pass: axe rules and this project's own detections. Keyboard, expanded UI and fix verification run in the full page audit.",
  "results.noMarkerOffScreenshot": "no marker \u00b7 outside the screenshot",
  "score.checksPassed": "{count} automated checks passed",
  "score.nonLinearNote":
    "Each line is the score after fixing that severity on its own. The score is non-linear, so fixing more than one recovers less than the lines added together.",
  "wcagReading.failsBy": "Fails by",

  "home.howItWorks.kicker": "How it works",
  "home.howItWorks.title": "One page, opened, located and verified",
  "home.checks.kicker": "Checks included",
  "home.checks.title": "Every automated check, plus the passes a tool can't run on its own",
  "home.sandbox.kicker": "Sandbox verification",
  "home.sandbox.title": "Every fix is proved on a copy, so your site is never touched",
  "home.sandbox.body":
    "We apply the change to a copy of the page, run the check again, then undo it. If the issue stops showing up, we mark the fix as verified. It is never a guarantee, and it never touches your real site.",
  "home.sandbox.nearestPassing": "nearest passing lightness, same hue",
  "home.sandbox.measurement": "Contrast measurement \u00b7 1.4.3 AA",
  "home.sandbox.found": "found \u00b7 minimum for normal text is {required}:1",
  "home.export.kicker": "Export",
  "home.export.title":
    "Two exports for two readers: the person who decides and the person who fixes",
  "home.export.pdfFor": "for the person who decides",
  "home.export.pdfTitle": "Score, ruler and impact in plain language",
  "home.export.pdfBody":
    "Summary, severity levels and each finding's impact on people. Ready to send to a client or a product team, with no engineering context required.",
  "home.export.mdFor": "for the person who fixes",
  "home.export.mdTitle": "Selector, snippet and verification status",
  "home.export.mdBody":
    "A severity table and a prioritized list, ready to paste into a ticket or a pull request, with the verified fixes already marked.",
  "home.track.kicker": "Over time",
  "home.track.title": "Audit again later and see exactly what moved",
  "home.track.body":
    "A page that passes today can fail after the next deploy. Every audit you run signed in is saved, and the next one is compared rule by rule against it \u2014 not just a new number, but which barriers cleared and which came back.",
  "home.track.previousAudit": "Previous audit",
  "home.track.thisAudit": "This audit",
  "home.track.daysLater": { one: "{count} day later", other: "{count} days later" },
  "home.track.note":
    "History is saved when you sign in with GitHub or Google. Everything else on this page \u2014 the audit, the fixes and the exports \u2014 works without an account.",

  "home.cta.measured": "Measured",
  "home.cta.located": "Located",
  "home.cta.verified": "Verified",
  "home.cta.title": "Audit a page now and see where each barrier is",
  "home.cta.body":
    "No account, no extension, no change to your site. The report is ready in under half a minute and exports as PDF or Markdown.",
  "home.cta.publicOnly":
    "We can only audit public pages. Private or internal addresses will be refused.",

  "home.rule.contrast": "Text contrast against a computed background",
  "home.rule.alt": "Text alternatives for images and icons",
  "home.rule.name": "Accessible name for fields, buttons and ARIA controls",
  "home.rule.headings": "Heading order and structural relationships",
  "home.rule.linkPurpose": "Ambiguous or unlabeled link purpose",
  "home.rule.targetSize": "Minimum target size",
  "home.rule.lang": "Declared page language",
  "home.rule.zoom": "Viewport that does not block zoom",

  "home.pass.keyboard": "Keyboard",
  "home.pass.keyboardDesc":
    "Tabs through the page to check focus order, keyboard traps and focus you can't see",
  "home.pass.context": "Context",
  "home.pass.contextDesc":
    "Checks the page again at mobile size and after opening menus and expandable sections",
  "home.pass.vision": "Vision",
  "home.pass.visionDesc":
    "Simulates color blindness (deuteranopia, protanopia, tritanopia), low vision and grayscale",
  "home.pass.motion": "Motion",
  "home.pass.motionDesc": "Checks that the page respects the visitor's reduced-motion setting",
  "home.pass.live": "Live",
  "home.pass.liveDesc": "Watches for updates announced to screen readers (live regions)",
  "home.pass.review": "Review",
  "home.pass.reviewDesc": "Lists what a person still needs to check, with the steps to confirm it",

  "home.step1.title": "Opened in a real browser",
  "home.step1.body":
    "We open the page in a real browser, let it finish loading, then run the axe-core accessibility tests on it. This works even on sites with strict security rules (CSP).",
  "home.step2.title": "Every finding is measured and tied to an element",
  "home.step2.body":
    "Contrast ratio, selector, code snippet and position on the screenshot. Repeated issues are grouped, so one fix can cover several elements at once.",
  "home.step3.title": "Each fix is tested before we suggest it",
  "home.step3.body":
    "We apply the change to a copy of the page, run the check again, then mark the result as verified or needs review.",

  "home.example.name": "Contrast (Minimum)",
  "home.example.title": "Text below the minimum contrast",
  "home.example.summary":
    "No critical blockers, but 1 serious finding still makes the page harder to use for people who rely on assistive technology.",

  "home.example.desc":
    "Ensures the contrast between foreground and background colors meets the WCAG threshold.",
  "home.example.fixText": "Set the text color to {hex} \u2192 {ratio}:1.",
  "impact.contrast":
    "People with low vision or reduced contrast sensitivity may be unable to read this text, especially on low-quality screens or in bright light.",
  "impact.alt":
    "Screen-reader users get nothing where this image should carry meaning. They hear a file name, or silence, instead of the content.",
  "impact.name":
    "Screen-reader users hear only the element's type (\u201clink\u201d, \u201cbutton\u201d, \u201cedit\u201d) with no idea what it does, so they can't decide whether to activate it.",
  "impact.lang":
    "Screen readers pick the wrong pronunciation rules, so the page is read aloud in the wrong accent or language and can become unintelligible.",
  "impact.title":
    "The page title is the first thing a screen reader announces, and the label shown in tabs, history and bookmarks. Without it, people can't tell pages apart.",
  "impact.zoom":
    "Blocking pinch-zoom stops low-vision users from enlarging the text, which many rely on to read at all on a phone.",
  "impact.headingOrder":
    "Screen-reader users navigate by heading level to skim a page; a skipped or out-of-order level makes the structure misleading and hides where sections begin.",
  "impact.headingOne":
    "Without a top-level heading, screen-reader users have no reliable landmark for \u201cwhat this page is about\u201d and can't jump to the main content by heading.",
  "impact.landmark":
    "Landmark regions let screen-reader users jump straight to navigation, main content or the footer; content outside them can only be reached by reading everything in order.",
  "impact.list":
    "Screen readers announce \u201clist, N items\u201d and let users skip it; broken list markup loses that count and the ability to move item by item.",
  "impact.aria":
    "Incorrect or incomplete ARIA makes assistive technology announce the wrong role or state, which is often worse than no ARIA at all.",
  "impact.duplicateId":
    "Duplicate ids break the links between labels, controls and ARIA references, so the wrong element gets announced or activated.",
  "impact.frame":
    "Screen-reader users hear an unlabeled frame with no idea what it contains, so they may skip important embedded content.",
  "impact.focusVisible":
    "Sighted keyboard users lose track of where they are on the page when the focus indicator disappears, and can't tell which control they're about to activate.",
  "impact.focusOrder":
    "When Tab order doesn't follow the visual order, keyboard and screen-reader users are thrown around the page and can miss or repeat content.",
  "impact.keyboardTrap":
    "Keyboard users get stuck: focus enters a widget and can't leave, so the rest of the page becomes unreachable without a mouse.",
  "impact.tabindex":
    "A positive tabindex overrides the natural order, so keyboard focus jumps unpredictably and skips past nearby controls.",
  "impact.reachable":
    "These controls can't be reached with the keyboard at all, so anyone who doesn't use a mouse can't operate them.",
  "impact.targetSize":
    "Small touch targets are hard to hit for people with motor or dexterity limitations, and for anyone on a moving bus or with large fingers.",
  "impact.motion":
    "Users who set \u201creduce motion\u201d (often because animation triggers nausea or vertigo) still get movement they asked the system to suppress.",
  "impact.live":
    "Screen-reader users miss updates like errors, confirmations and counts, because the region that should announce them isn't set up to.",
  "impact.generic":
    "Assistive-technology users hit a barrier here that sighted mouse users don't, so the same task is harder or impossible for them.",

  "fix.describeField": "Describe this field",
  "fix.describeControl": "Describe this control",
  "fix.descriptivePageTitle": "Descriptive page title",
  "fix.labelWithId":
    'This {tag} has no accessible name. Add a <label> linked by its id ("{id}") so screen readers announce it.',
  "fix.labelNoId":
    "This {tag} has no id to bind a <label> to. Add an aria-label (or give it an id and a <label for>) so it has an accessible name.",
  "fix.htmlLang":
    "The <html> element has no lang attribute, so assistive tech can't tell which language to read. Set it to the page's primary language.",
  "fix.documentTitle":
    "The page has no <title>, the first thing screen readers announce and the label browsers show in tabs and history. Add a descriptive one.",
  "fix.metaViewport":
    "The viewport meta tag blocks pinch-zoom, which low-vision users rely on. Remove user-scalable=no and any maximum-scale below 5.",
  "fix.ariaName":
    'This {noun} has no accessible name, so screen readers announce it as just "{noun}". Add visible text inside it, or an aria-label.',
  "fix.nounLink": "link",
  "fix.nounButton": "button",
  "fix.ariaRequired":
    "This element's role requires ARIA attributes that are missing: {attrs}. Add each one with a valid value.",
  "fix.ariaNotAllowed":
    "These ARIA attributes aren't allowed on this element and should be removed (or change the element's role to one that permits them): {names}.",
  "fix.ariaRemove": "Remove: {names}",
  "fix.imageAltGuess":
    'This image has no alt text. There\'s a suggested description below. Confirm it matches the image, or use an empty alt ("") if the image is purely decorative.',
  "fix.imageAltNoGuess":
    "This image has no alt text. Add a short description if it's meaningful, or an empty alt (\"\") if it's decorative so screen readers skip it.",
  "fix.contrastWas": "(was {measured}:1, needs {required}:1)",
  "fix.contrastHueKept": " The hue stays the same; only the lightness changes.",
  "fix.contrastHueShifted":
    " (the hue is shifted toward neutral to reach the needed contrast on this background)",
  "fix.contrastForeground":
    "Replace text color {from} with {to} \u2192 {ratio}:1 against {bg} {was}.{hueNote}",
  "fix.contrastAlsoBackground": " Or keep the text and set the background to {bg}.",
  "fix.contrastBackground":
    "Text color {fg} can't reach {required}:1 on {bg} by changing the text alone. Set the background to {newBg} instead \u2192 {ratio}:1 {was}. The background hue stays the same; only its lightness changes.",
  "fix.contrastNeither":
    "Text color {fg} on {bg} reaches only {measured}:1 (needs {required}:1). Neither the text nor the background clears it by lightness alone on these hues, so pick a darker or lighter pairing.",

  "fix.headingOne.action":
    "Add one <h1> that describes the page's main purpose, at the start of the primary content, before the introductory text.",
  "fix.headingOne.caution":
    "Don't add an empty or visually hidden heading only to silence the rule unless that truly matches the page structure.",
  "fix.headingOrder.action":
    "Change the flagged heading so levels only ever increase by one (h2 to h3, never h2 to h4). Renumber for structure, not for visual size, and use CSS to size it.",
  "fix.headingOrder.caution":
    "Never skip a level to get a smaller font; style the correct level instead.",
  "fix.landmark.action":
    "Wrap the primary content in a <main> landmark. Keep site-wide navigation in <nav>, introductory branding in <header> and closing information in <footer>, so every part of the page sits inside a landmark.",
  "fix.list.action":
    "Make sure every <li> is a direct child of a <ul> or <ol> (and nothing but <li> sits directly inside them). Don't fake lists with <div>s and bullets.",
  "fix.duplicateId.action":
    "Give the flagged element a unique id. If several controls share one label, point each label/aria reference at its own id instead of reusing one.",
  "fix.frame.action":
    "Add a short, descriptive title attribute to the <iframe> saying what it contains.",
  "fix.focusVisible.action":
    "Give interactive elements a clearly visible focus style. Style :focus-visible rather than removing outlines. Never set outline: none without a replacement.",
  "fix.focusVisible.caution":
    "Don't rely on color change alone; keep a visible outline or box-shadow.",
  "fix.focusOrder.action":
    "Put the elements in the DOM in the order people should Tab through them, and remove positive tabindex values so focus follows the source order.",
  "fix.keyboardTrap.action":
    "Make sure focus can leave the widget with Tab / Shift+Tab (and Esc for dialogs). Manage focus in JS so it returns to a sensible place when the widget closes.",
  "fix.tabindex.action":
    'Remove tabindex values greater than 0. Use tabindex="0" to make a custom control focusable, or -1 to focus it from code. Never use positive numbers.',
  "fix.reachable.action":
    'Make each control a real focusable element: use <button>/<a> instead of a clickable <div>, or add tabindex="0" plus keyboard handlers to the custom control.',
  "fix.targetSize.action":
    "Give the target at least 24\u00d724px of hit area (44\u00d744 is safer on touch), or leave enough spacing around it. Pad the control rather than only enlarging an icon.",
  "fix.motion.action":
    "Wrap non-essential animation in a prefers-reduced-motion guard so it's suppressed for people who asked for less motion.",
  "fix.live.action":
    'Announce dynamic updates through a live region: put status text in an element with aria-live="polite" (or role="status"), and errors in aria-live="assertive".',

  "marker.bestPractice":
    "Best practice, reported as coverage. It is not tied to one positioned element.",
  "marker.context":
    "Found in a different context (mobile size or an opened state), so it is not on the desktop screenshot.",
  "marker.keyboard":
    "From the keyboard pass, so it appears on the focus path rather than as an issue marker.",
  "marker.docLevel":
    "Applies to the whole document or page structure, not a single positioned element.",
  "marker.offCapture":
    "The affected element is outside the part of the page we captured (the first 1200\u00d7800 pixels), is hidden, or has no visible box on the screenshot.",

  "wcag.1.1.1": "Non-text Content",
  "wcag.1.3.1": "Info and Relationships",
  "wcag.1.3.5": "Identify Input Purpose",
  "wcag.1.4.1": "Use of Color",
  "wcag.1.4.3": "Contrast (Minimum)",
  "wcag.1.4.4": "Resize Text",
  "wcag.1.4.10": "Reflow",
  "wcag.1.4.11": "Non-text Contrast",
  "wcag.2.1.1": "Keyboard",
  "wcag.2.4.1": "Bypass Blocks",
  "wcag.2.4.2": "Page Titled",
  "wcag.2.4.4": "Link Purpose (In Context)",
  "wcag.2.4.7": "Focus Visible",
  "wcag.2.5.8": "Target Size (Minimum)",
  "wcag.3.1.1": "Language of Page",
  "wcag.3.3.2": "Labels or Instructions",
  "wcag.4.1.2": "Name, Role, Value",

  "severity.criticalDesc": "Blocks access outright for some assistive-tech users.",
  "severity.seriousDesc": "Major barrier. Many people can't complete the task.",
  "severity.moderateDesc": "Noticeable friction, but the task stays possible.",
  "severity.minorDesc": "Small polish item with limited impact.",

  "ssrf.privateAddress":
    "This address is a private or internal one, so we can't audit it. Enter a public web page instead.",
  "ssrf.invalidAddress": "That doesn't look like a valid web address. Check it and try again.",
  "ssrf.onlyHttp": "Only web pages (addresses starting with http or https) can be audited.",
  "ssrf.notFound": "We couldn't find a site at that address. Check the spelling and try again.",

  "sim.deuteranopiaDesc":
    "Red-green color blindness, missing green cones. Affects about 6% of men.",
  "sim.protanopiaDesc": "Red-green color blindness, missing red cones. Affects about 2% of men.",
  "sim.tritanopiaDesc": "Blue-yellow color blindness, missing blue cones. Rare, about 0.01%.",

  "report.projectionCaveat":
    ". This is only a projection of the score, not a pass for WCAG. Meeting WCAG also depends on the moderate items and on manual review.",
  "report.recommendations": "Recommendations",
  "report.wcagDisclaimer":
    "AccessCheck runs axe-core against WCAG levels A and AA (2.0, 2.1 and 2.2). Automated testing covers only part of the WCAG checkpoints. The rest need a person to review, often with a screen reader or other assistive technology. Level AAA is not checked, and this report is not a statement of conformance.",
  "report.findingsIntro":
    "Each finding grouped by severity and mapped to its WCAG A/AA success criterion, with the human impact, the measurement where one exists, and a fix re-audited in a sandbox copy.",
  "report.scoringModelNote":
    "These two audits were scored by different models (v{from} and v{to}), so the numbers above are not a rise or a fall. Which rules were fixed and which regressed is unaffected.",

  "site.theSite": "the site",
  "site.notFound": "Site scan not found.",
  "context.recheckShort": "Re-check this element in the affected context.",
  "context.recheckLong":
    "Re-check this element in the affected context; the engine did not sandbox a fix here.",

  "sim.normalDesc": "Default rendering, with no vision filter.",
  "sim.lowVisionDesc": "Reduced sharpness and contrast sensitivity.",
  "sim.grayscaleDesc": "All color removed. Checks that meaning survives without hue.",

  "wcagReading.noA": "No automated level-A failures",
  "wcagReading.noAA": "No automated level-AA failures",
  "provenance.title": "Provenance",
  "provenance.complementary":
    "Complementary passes: keyboard, mobile viewport, expanded UI, vision, motion, live regions.",
  "stepper.previous": "Previous occurrence",
  "stepper.next": "Next occurrence",
  "seal.verified": "Verified: the rule stopped flagging the element",
  "seal.needsReview": "Needs review: the suggestion alone doesn't clear it",
  "seal.notReaudited": "Not re-audited",

  "history.title": "Audit history",
  "history.kicker": "History",
  "history.scoreLabel": "Score",
  "history.noMatches": "No audits match your filters",
  "history.empty": "No audits yet",
  "history.emptyBody":
    "Run an audit while signed in and it\u2019ll show up here, so you can track each site\u2019s score over time.",
  "history.searchPlaceholder": "Search by domain\u2026",
  "history.clearSearch": "Clear search",
  "history.filterByScore": "Filter by score",

  "site.runningAverage": "running average across audited pages",
  "site.finalAverage": "average across all audited pages",
  "site.newAuditTitle": "Start a new audit",
  "site.newAudit": "New audit",
  "site.fullAudit": "Full-site accessibility audit",
  "site.auditFailed": "Audit failed",
  "site.score": "Site score",
  "site.noAutomatedFindings": "No automated findings",
  "site.noFindings": "No findings",
  "site.pageFailed": "This page could not be audited.",

  "severity.critical": "Critical",
  "severity.serious": "Serious",
  "severity.moderate": "Moderate",
  "severity.minor": "Minor",

  "cue.verified": "· verified in sandbox",
  "cue.partial": "· partly verified",
  "cue.sampled": "· one example checked",
  "cue.failed": "· needs review",

  "detail.sampleText": "Sample text",
  "detail.currentView": "current",
  "detail.largeText": " (large text)",
  "detail.verifiedOnElement": "Verified on this element",
  "detail.verifiedOnElementNote": "Passes WCAG AA, confirmed by re-audit of the located element",
  "detail.uncertain": "Result uncertain",
  "detail.uncertainNote": "Can't confirm this reaches the minimum on the real background",
  "detail.calculated": "Calculated",
  "detail.calculatedNote":
    "Would reach {ratio}:1, calculated from the detected colors, not verified live",
  "detail.previewNote":
    "Preview uses the detected foreground and background colors. Typography and page context are not reproduced.",
  "detail.contrastPreview": "Contrast preview",
  "detail.property": "Property",
  "detail.detected": "Detected",
  "detail.suggested": "Suggested",
  "detail.result": "Result",
  "detail.impactOnUsers": "Impact on users",
  "detail.affectedElement": "Affected element",
  "detail.howToFix": "How to fix",
  "detail.verificationResult": "Verification result",
  "detail.sandboxNote": "Fixes are applied and reverted in a sandbox copy. {host} was not altered.",

  "verdict.label.verified": "Verified fix",
  "verdict.label.partial": "Partly verified",
  "verdict.label.sampledMany": "Examples checked",
  "verdict.label.sampledOne": "One example checked",
  "verdict.label.failed": "Needs human review",
  "verdict.label.unverifiable": "Could not verify",
  "verdict.label.noAutoFix": "Needs human review",
  "verdict.label.bestPractice": "Best practice",
  "verdict.label.complementary": "Not re-audited",

  "verdict.others": {
    one: "The other {count} occurrence shares the same suggestion but was not individually verified.",
    other:
      "The other {count} occurrences share the same suggestion but were not individually verified.",
  },
  "verdict.verifiedShared":
    "Applied in a sandbox copy and re-audited: the rule stopped flagging each of the {count} occurrences.",
  "verdict.verifiedSingle":
    "Applied in a sandbox copy and re-audited: the rule stopped flagging the element.",
  "verdict.partial":
    "Re-audited each occurrence in a sandbox copy: {cleared} of {total} cleared, {failed} still flag. Review the ones that still flag.",
  "verdict.sampledOne":
    "The sampled element passed after the suggested change in a sandbox copy. {others}",
  "verdict.sampledMany":
    "Re-audited {reaudited} of {total} occurrences in a sandbox copy (one representative per suggested fix): {cleared} passed{failedTail}. {others}",
  "verdict.sampledFailedTail": ", {failed} still flag",
  "verdict.failedSubjectSingle": "This element",
  "verdict.failedSubjectSampled": "The sampled element",
  "verdict.failedMeasured":
    "{subject} still fails after the suggested change: the new color reaches {ratio}:1 against the sampled background, but the rule still flags it. The real background may be an image, gradient or overlapping layer.{tail}",
  "verdict.failedPlain":
    "{subject} still fails after the change was applied in a sandbox copy. Review it by hand.{tail}",
  "verdict.unverifiable":
    "The element couldn't be re-audited in the sandbox copy (it wasn't found, or verification was cut short for time). Confirm the change by hand.",
  "verdict.noAutoFix":
    "This finding has no automatic fix. A person needs to decide the right change for the page.",
  "verdict.bestPractice":
    "Best practice, not a WCAG success criterion. Worth fixing, but it does not affect the WCAG reading.",
  "verdict.complementary":
    "Found by a complementary pass (keyboard, mobile, vision or dynamic state); it isn't re-audited in a sandbox copy. Fix and re-run to confirm.",

  "keyboard.region.offscreen": "outside the visible viewport",
  "keyboard.region.top": "near the top of the page",
  "keyboard.region.middle": "in the middle of the page",
  "keyboard.region.bottom": "near the bottom of the page",

  "keyboard.invisible.noStyles":
    "Focus reached this element and produced no detectable outline, box-shadow, border or background change.",
  "keyboard.invisible.noOutline":
    "no outline appeared (outline-style: {style}, outline-width: {width})",
  "keyboard.invisible.boxShadow": "the box-shadow stayed {value}",
  "keyboard.invisible.border": "the border stayed {width} {color}",
  "keyboard.invisible.background": "the background stayed {value}",
  "keyboard.invisible.nothingChanged":
    "Focus reached this element and nothing changed: {unchanged}. A focus indicator is expected here — an outline, a box-shadow, a border or a background that differs from the element's resting style.",
  "keyboard.invisible.title": {
    one: "No visible focus indicator on {count} element",
    other: "No visible focus indicator on {count} elements",
  },
  "keyboard.invisible.desc": {
    one: "Focusing this element by keyboard produced no detectable outline, box-shadow, border or background change. Sighted keyboard users can't tell where they are on the page.",
    other:
      "Focusing these elements by keyboard produced no detectable outline, box-shadow, border or background change. Sighted keyboard users can't tell where they are on the page.",
  },
  "keyboard.invisible.fix":
    "Add a clear :focus-visible style (for example outline: 2px solid; outline-offset: 2px;) instead of removing the outline with outline: none.",

  "keyboard.jump.up": "focus moved back up the page",
  "keyboard.jump.back": "focus moved back to the left on the same line",
  "keyboard.jump.where": ', from {fromRegion} ("{fromLabel}") to {toRegion} ("{toLabel}")',
  "keyboard.jump.measured": " Measured from the top of the viewport: {from}px → {to}px.",
  "keyboard.jump.reason":
    "Stop {from} → Stop {to}: {movement}{where}.{measured} This is geometric evidence, not proof: check whether it matches the reading order you intend.",

  "keyboard.trap.title": "Keyboard focus is trapped",
  "keyboard.trap.desc":
    "Pressing Tab kept focus on the same element instead of advancing. Keyboard and screen-reader users can get stuck here with no way out.",
  "keyboard.trap.fix":
    "Make sure the element doesn't intercept Tab, or (if it's a dialog) give a clear way to leave: press Esc to close it and return focus to the control that opened it.",
  "keyboard.trap.occurrence":
    "Tab was pressed here and focus stayed on this same element, so the walk could go no further.",

  "keyboard.unreachable.title": {
    one: "{count} interactive control is not keyboard-reachable",
    other: "{count} interactive controls are not keyboard-reachable",
  },
  "keyboard.unreachable.desc": {
    one: "{count} element behaves as interactive (click handlers or ARIA roles) but Tab never reaches it, so it's usable by mouse only.",
    other:
      "{count} elements behave as interactive (click handlers or ARIA roles) but Tab never reaches them, so they're usable by mouse only.",
  },
  "keyboard.unreachable.fix":
    'Give each control a native focusable element (<button>, <a href>) or add tabindex="0" and keyboard handlers so it can be reached and operated.',
  "keyboard.unreachable.occurrence":
    "This element looks interactive (a click handler or an ARIA role) but the Tab walk never landed on it. Confirm it is meant to be operable.",

  "keyboard.order.title": {
    one: "Focus order jumps out of sequence {count} time",
    other: "Focus order jumps out of sequence {count} times",
  },
  "keyboard.order.desc":
    "The Tab order doesn't follow the visual reading order (top-to-bottom, left-to-right). Focus jumps backwards or upward, which is disorienting for keyboard and screen-reader users. Each jump is listed below: whether it is wrong depends on the reading order the page intends, so they need a human check.",
  "keyboard.order.fix":
    "Match the DOM order to the visual order and avoid reordering with CSS (order, flex-direction: row-reverse, absolute positioning) or positive tabindex.",

  "keyboard.tabindex.title": {
    one: "{count} element uses a positive tabindex",
    other: "{count} elements use a positive tabindex",
  },
  "keyboard.tabindex.desc":
    "A positive tabindex overrides the natural tab order and is almost always a source of confusing, hard-to-maintain focus behavior.",
  "keyboard.tabindex.fix":
    'Replace positive tabindex values with tabindex="0" (or none) and let the DOM order define the sequence.',
  "keyboard.tabindex.occurrence":
    "This element carries a positive tabindex, so it is pulled out of the document order and visited before elements that come before it on the page.",

  "stage.structure": "Checking page structure",
  "stage.rules": "Running accessibility rules",
  "stage.focus": "Walking the focus path",
  "stage.report": "Preparing the report",

  "panel.scoreOutOf": " out of 100 — back to the summary",
  "panel.scoreHeading": "Audit score",
  "panel.perHundred": "/100",
  "panel.count.critical": "critical",
  "panel.count.serious": "serious",
  "panel.count.moderate": "moderate",
  "panel.count.minor": "minor",
  "panel.count.passed": "passed",
  "panel.count.bestPractice": "best practice",
  "panel.count.manualReview": "manual review",

  "panel.evidence": "Evidence",
  "panel.evidenceNote": "viewport screenshot",
  "panel.evidenceNoteMarked": "viewport screenshot · {count} marked",
  "panel.screenshotAlt": "Screenshot of {url}",

  "panel.copied": "Copied",
  "panel.copyFailed": "Copy failed",
  "panel.copySelector": "Copy selector",
  "panel.copyHtml": "Copy HTML",

  "panel.occurrences": "Occurrences",
  "panel.occurrenceOf": "Occurrence {at} of {total}",
  "panel.neverReached": "Never reached by Tab",
  "panel.stopN": "Stop {n}",
  "panel.geometryUnsure":
    "Geometry alone cannot settle this one — check it against the reading order you intend.",
  "panel.position": "Position",
  "panel.positionValue": "{w}×{h}px at {x}, {y}",
  "panel.offViewport": " · outside the viewport when it was measured",
  "panel.element": "Element",
  "panel.abbreviated":
    "Abbreviated with … , and attributes that can carry what you typed are left out. Evidence, not markup to paste back.",
  "panel.locating": "Looking for it…",
  "panel.locate": "Locate on page",

  "panel.alsoFailsIn": "Also fails in {contexts}",
  "panel.problem": "Problem",
  "panel.suggestedFix": "Suggested fix",
  "panel.findings": "Findings",
  "panel.readingLanguage":
    "This reading was produced in {language}. Audit the page again to get it in this one.",
  "panel.noFailures": "None of the checks this build runs found a failure.",

  "panel.checksPerformed": "Checks performed",
  "panel.check.primed": "Walked the page first so content that renders on scroll was read",
  "panel.check.axe": "axe-core, WCAG A and AA (2.0, 2.1, 2.2) plus best practice",
  "panel.check.targetSize": "Target size (WCAG 2.5.8)",
  "panel.check.liveRegions": "Live regions (WCAG 4.1.3)",
  "panel.check.screenshot": "Screenshot of the visible viewport",
  "panel.check.focusPath": "Focus path with real Tab presses",
  "panel.check.focusPathStopped": "Focus path with real Tab presses (stopped early)",

  "panel.mark.noFocusRing": "no focus ring",
  "panel.mark.checkOrder": "check order",
  "panel.mark.stop": "stop",

  "panel.focusPath": "Focus path",
  "panel.focusPathAbsent":
    "This reading has no focus path. Walking it attaches Chrome's debugger for the length of the walk — Chrome shows its own banner meanwhile — types Tab into the page, and puts focus and scroll back afterwards.",
  "panel.showFocusPath": "Show focus path",
  "panel.previousStop": "Previous stop",
  "panel.previous": "Previous",
  "panel.nextStop": "Next stop",
  "panel.next": "Next",
  "panel.stopOf": "Stop {at} of {total}",
  "panel.showNearbyOnly": "Show nearby stops only",
  "panel.showComplete": "Show complete path",
  "panel.clearOverlay": "Clear overlay",
  "panel.backToWhereYouWere": "Back to where you were",
  "panel.drawingAll": "Every stop is drawn. The current one is highlighted; the rest are dimmed.",
  "panel.drawingWindow":
    "Drawing the current stop and {neighbours} either side, so the page stays readable.",
  "panel.walkNow": "Walk the focus path now",

  "panel.quickAudit": "Quick audit",
  "panel.auditingTab": "Auditing this tab",
  "panel.runningNote":
    "The score appears when every step above has finished. The page is not modified.",
  "panel.runningNoteDeep":
    " Walking the focus path attaches Chrome's debugger for that step only — Chrome shows its own banner meanwhile — and it is released before the report appears.",
  "panel.announceStep": "Auditing. Step {n}: {stage}.",

  "panel.coverageLimitations": "Coverage limitations",
  "panel.notChecked": "Not checked in this build",
  "panel.notCheckedNote": "A reading from this build is never a clean bill of health for the page.",
  "panel.auditAgain": "Audit this tab again",
  "panel.runQuickAudit": "Run quick audit",
  "panel.quickAuditNote": "No debugger or keyboard focus path",

  "panel.idleTitle": "Nothing audited yet",
  "panel.idleBody":
    "Click the AccessCheck icon in the toolbar to audit the page you are on. The audit runs the rules and then walks the focus path, which attaches Chrome's debugger for that step. Nothing leaves your browser.",
  "panel.unsupportedKicker": "Not supported here",
  "panel.unsupportedTitle": "This page cannot be audited",
  "panel.errorKicker": "Audit failed",
  "panel.errorTitle": "The audit could not finish",
  "panel.tryAgain": "Try again",

  "panel.pageUnreachable": "The page could not be reached from here.",
  "panel.elementGone":
    "That element is no longer in the page: the DOM changed since the audit ran.",
  "panel.someStopsGone":
    "{missing} of {total} stops are no longer in the page, so they could not be drawn.",
  "panel.someStopsOffScreen":
    "{offScreen} of {total} stops are outside the viewport right now, so only the rest are drawn.",
} satisfies Record<string, Message>;

export type Catalog = typeof en;
