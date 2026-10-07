import type { Message } from "./shape";

export const en = {
  "unit.stop": { one: "{count} stop", other: "{count} stops" },
  "unit.detectedControl": { one: "{count} detected control", other: "{count} detected controls" },
  "unit.styleSheet": { one: "{count} stylesheet", other: "{count} stylesheets" },
  "unit.mediaFile": { one: "{count} media file", other: "{count} media files" },
  "unit.element": { one: "{count} element", other: "{count} elements" },
  "unit.and": "and",

  "privacy.metaTitle": "Privacy · AccessCheck extension",
  "privacy.metaDescription": "What the AccessCheck browser extension reads, and where it goes.",
  "meta.title": "AccessCheck: measure, locate and trace every accessibility barrier",
  "meta.description":
    "Paste a web address. AccessCheck opens the page in a real browser, runs axe-core (WCAG levels A and AA) plus keyboard, mobile and motion checks, and returns each finding tied to the element that caused it, with a fix tested on a copy of the page.",
  "nav.skipToContent": "Skip to content",
  "nav.howItWorks": "How it works",
  "nav.checks": "Checks",
  "nav.evidenceLens": "Evidence Lens",
  "capture.stopOutside":
    "Stop {n} sits about {docY}px down the page. No screenshot in this report covers it.",
  "capture.stopInsideScroller":
    "Stop {n} is inside a scrolling area ({context}). This screenshot was taken with that area at rest, so the stop is not drawn where the walk found it.",
  "capture.stopInsideScrollerPlain":
    "Stop {n} is inside a scrolling area. This screenshot was taken with that area at rest, so the stop is not drawn where the walk found it.",
  "capture.stopUnplaced": "Stop {n} had no measurable position on the page.",
  "capture.noStopsLanded": "No focus stop appears in this screenshot.",
  "capture.focusHint": "Pick a stop in the focus path to follow it here.",
  "capture.regionLabel": "Screenshot of the page at {docY}px down",
  "capture.backToFirst": "Back to the first screenshot",
  "capture.regionMissedTitle": "This area was not captured",
  "capture.regionMissedTime":
    "The audit ran out of time before it could capture the page around {docY}px down. Everything else in the report is unaffected.",
  "capture.regionMissedBytes":
    "The report hit its size limit before it could capture the page around {docY}px down. Everything else in the report is unaffected.",
  "capture.regionMissedFailed":
    "The page stopped responding while the area around {docY}px down was being captured. Everything else in the report is unaffected.",
  "capture.noMarkersLanded":
    "No finding is marked on this screenshot. Open a finding and the report moves to the part of the page it came from.",
  "language.label": "Language",
  "language.followBrowser": "Browser default",

  "api.site.noAddress": "No web address was provided. Enter a site address and try again.",
  "api.site.rateLimited": "Too many site audits in a short time. Wait a few minutes and try again.",
  "api.site.unavailable":
    "Site audits are temporarily unavailable. Audit a single page instead, or try again later.",
  "api.site.disabled": "Site audits aren't available right now. Audit a single page instead.",
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
    one: "{count} live region is on screen but hidden from assistive technology",
    other: "{count} live regions are on screen but hidden from assistive technology",
  },
  "audit.live.hiddenDesc":
    'The region shows text on screen but has aria-hidden="true", so screen readers treat it as absent and never announce what sighted users can read in it.',
  "audit.live.hiddenFix":
    "Remove aria-hidden from the live region. If it has to be off screen, hide it with a screen-reader-only pattern instead, which keeps it in the accessibility tree.",
  "audit.live.conditionalTitle": {
    one: "{count} live region starts out hidden",
    other: "{count} live regions start out hidden",
  },
  "audit.live.conditionalDesc":
    'When the page was read, the region was hidden (display:none, visibility:hidden, the hidden attribute or aria-hidden) and showed nothing yet. That is expected for a message the page reveals after an action, and most screen readers announce a role="alert" revealed that way. But text written into the region while it stays hidden is never announced, and reading the page alone can\'t tell the two cases apart.',
  "audit.live.conditionalFix":
    "Trigger whatever fills the region, such as submitting the form or adding to the cart, and listen with a screen reader. If the update isn't announced, keep the region in the accessibility tree and change its text instead of revealing a hidden one.",
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
    one: "{count} interactive control is below the 24\u00d724 CSS pixel minimum and sits too close to another target to qualify for the spacing exception. Small, crowded targets are hard to hit for people with motor impairments or on touch screens.",
    other:
      "{count} interactive controls are below the 24\u00d724 CSS pixel minimum and sit too close to another target to qualify for the spacing exception. Small, crowded targets are hard to hit for people with motor impairments or on touch screens.",
  },
  "audit.target.fix":
    "Make each control at least 24×24px, or space it out so a 24px circle centered on it doesn't overlap its neighbors. Padding on the control usually does both.",

  "scanFail.browserUnavailable":
    "The browser we use to open the page stopped responding before the audit could run.",
  "scanFail.browserSlow": "The browser we use to open the page took too long to start. Try again.",
  "scanFail.unreachable": "The page could not be reached.",
  "scanFail.timeout": "The accessibility audit could not finish on this page in time.",
  "scanFail.generic": "The audit failed.",
  "scanFail.httpError":
    "The page returned an error (HTTP {status}), so we couldn't audit it. Check the address and try again.",
  "scanFail.navigationTimeout": "The page took longer than {seconds}s to respond.",
  "scanFail.engineMissing":
    "The audit engine could not be loaded into the page ({path}). Build it with `npm run build:engine`. {detail}",
  "scanFail.engineVersion":
    "The audit engine in the page reports version {found}, but this driver needs {needed}. Rebuild it with `npm run build:engine`.",

  "home.lens.sharedColor": "Contrast finding, another element sharing this color",
  "home.lens.locatedElement": "Contrast finding, located element",
  "home.lens.locatedVerified": "Located element, fix tested",
  "home.example.headingSkip": "Heading level skips",

  "api.internal": "Something went wrong on our side. Try again.",
  "api.badRequest": "We couldn't read that request. Reload the page and try again.",
  "api.noAddress": "No web address was provided. Enter a page address and try again.",
  "api.rateLimited": "Too many audits in a short time. Wait about a minute and try again.",
  "api.invalidAddress": "That doesn't look like a valid web address. Check it and try again.",
  "api.tooSlow":
    "This page took too long to finish. Try a single, lighter page instead of a large home page.",
  "api.auditFailed": "We couldn't audit this page. Try another web address.",

  "report.passedChecks": "Passed checks",
  "report.priorityProjection": "Priority projection",
  "report.current": "Current",
  "report.estimated": "Estimated",
  "report.actionPlan": "Action plan",

  "md.reportTitle": "Accessibility report: {name}",
  "md.url": "URL",
  "md.elementsScanned": "Elements checked",
  "md.generated": "Generated",
  "md.manualOutside": {
    one: "{count} manual-review item is not counted here.",
    other: "{count} manual-review items are not counted here.",
  },
  "md.wcagReading": "WCAG levels",
  "md.failsBy": "fails by {criteria}",
  "md.noAFailures": "no automated level-A failures",
  "md.noAAFailures": "no automated level-AA failures",
  "md.aaaNote": "not evaluated. AccessCheck runs A and AA (WCAG 2.0/2.1/2.2)",
  "md.findings": "Findings",
  "md.needsManualReview": "Needs manual review",
  "md.whereLabel": "Where",
  "identity.in": "in {where}",
  "identity.nth": "{n} of {total}",
  "md.howToCheck": "How to check",
  "md.checksPassed": "Automated checks passed ({count})",
  "md.footer":
    "_Fixes are tested on a copy of the page, so the audited site is never changed. This result covers only what a tool can decide on its own. It is not a conformance statement._",
  "md.bestPracticeNote": "**Best practice** (not a WCAG success criterion)",
  "md.passLabel": "Check",
  "md.affected": "Affected",
  "md.elementsLabel": "Elements",
  "md.measuredLabel": "Measured",
  "md.minimumAA": "minimum AA {required}:1",
  "md.fixReaches": "fix reaches {ratio}:1",
  "md.impact": "Impact",
  "md.suggestedFix": "Suggested fix",
  "md.setProp": "Set `{prop}` to {hex}.",
  "md.andMore": "(+{count} more)",
  "md.noFailures":
    "No failures were detected automatically on this page. That is not the same as WCAG conformance.",
  "md.manualOutsideScore":
    "Automated testing couldn't decide these, so confirm them by hand. They are not counted here.",

  "preview.stillFlagged":
    "The calculated pair reaches the minimum, but the rule still flags the located element when run again on the page. The real background is probably an image, gradient or overlapping layer, not the solid color that was sampled.",
  "preview.noColorReaches": "No color change alone reaches the minimum on this hue pair.",

  "scanError.hint.invalidUrl": "Check the address and try again.",
  "scanError.hint.blockedUrl": "Only public web pages can be audited.",
  "scanError.hint.rateLimited": "Wait a moment before starting another audit.",
  "scanError.hint.navigationTimeout": "The site may be slow, or it may block automated browsers.",
  "scanError.hint.navigationFailed": "Check the address. The site may also be offline.",
  "scanError.hint.httpError":
    "The address may be wrong, or the page may have been removed or need a login.",
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
    "We couldn't start the browser used to open the page. Try again.",
  "scanError.message.timeout": "The audit ran out of time on this page.",
  "scanError.message.interrupted": "The audit stopped before finishing.",
  "scanError.message.internal": "The audit stopped before it could finish. Try again.",

  "scanWarning.screenshotUnavailable": "The screenshot could not be taken in time.",
  "scanWarning.fixDetailsSkipped":
    "Some findings show general guidance instead of a specific suggested fix, and name their elements by selector only.",
  "scanWarning.regionsSkipped":
    "Some areas of the page below the first screenshot were not captured, so a few findings have no picture of where they are.",
  "scanWarning.markersSkipped": "The marks could not be placed on the screenshot.",
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
    "To audit local files, turn on file access for the extension in chrome://extensions.",
  "blocked.noAddress": "This tab has no address the audit can read.",

  "background.wokeUp":
    "Chrome put the extension to sleep before the audit finished, so nothing was measured. Run the audit again.",
  "background.pageUnreadable": "The page could not be read.",
  "background.auditEmpty": "The audit returned nothing.",
  "background.permissionLapsed":
    "This tab moved to another page, so the access you gave it has expired. Click the AccessCheck icon on the page to audit it again.",
  "background.otherTab":
    "To audit another tab, click the AccessCheck icon on that tab. That click is what gives the extension access to it.",
  "background.nothingAudited": "Nothing has been audited in this tab yet.",
  "background.tabUnreachable":
    "This tab moved to another page, so the audited page can no longer be reached from here.",
  "background.markupFailed": "The marks could not be drawn on the page.",
  "background.tabBehind":
    "This report is for another tab. Go back to it to locate findings on the page or check the keyboard.",

  "deep.cancelled":
    "You stopped it, so the focus path was not walked. The rest of this report is unchanged.",
  "deep.cancelledPlain": "The keyboard check was cancelled, so the focus path was not walked.",
  "deep.alreadyAttached":
    "Another debugger is attached to this tab, usually DevTools. Close it and check the keyboard again.",
  "deep.notDebuggable":
    "Chrome does not allow debugging this page, so the focus path cannot be walked here.",
  "deep.attachRefused": "Chrome refused to attach the debugger: {reason}",
  "deep.tabMovedOn":
    "The tab moved to another page while the focus path was being walked, so the keyboard check stopped.",
  "deep.unfinished": "The keyboard check could not finish: {reason}",
  "deep.notReleased":
    "Chrome would not release the debugger. Its banner may stay on the tab until you reload it.",

  "engine.missing":
    "The AccessCheck audit engine was not injected into this page. Reload the extension and try again.",
  "engine.versionMismatch":
    "The audit engine in the page reports version {found}, but this version of the extension needs {needed}.",

  "warning.keyboardSkipped":
    'The focus path was not walked. Use "Check keyboard" to send real Tab presses through the page.',
  "warning.keyboardFailed": "The focus path was not walked. {reason}",
  "warning.lazyContent":
    "Content that only appears when you scroll to it was not loaded, so nothing below the fold was read. The audit usually scrolls through the page first, but this time it could not.",
  "warning.contextsSkipped":
    "The mobile viewport check needs viewport emulation, which this version doesn't have.",
  "warning.reducedMotionSkipped":
    "The reduced motion check needs media emulation, which this version doesn't have. Target size and live regions were checked.",
  "warning.walkChangedPage":
    "Pressing Tab through this page opened something that stayed open, like a menu, a panel or a suggestion list. The rules had already read the page, so auditing again may give a slightly different reading.",
  "warning.contentUnsettled":
    "The page was still changing after six seconds of waiting, so the rules read a moving target. Findings from a page that hasn't settled aren't reliable and can differ between runs.",
  "warning.crossOrigin":
    "{assets} on this page {verb} from another origin, which this version isn't allowed to fetch. Rules that read those files, such as the orientation lock check, are marked for review instead of passing. Everything read from the page itself is unaffected.",
  "warning.crossOriginComes": "comes",
  "warning.crossOriginCome": "come",

  "caveat.contentUnsettled": "page still changing",
  "caveat.walkChangedPage": "the walk opened content",
  "caveat.crossOriginAssets": "some styles unreadable",
  "caveat.screenshotUnavailable": "no screenshot",
  "caveat.markersSkipped": "no marks on the screenshot",
  "caveat.fixDetailsSkipped": "fix details missing",
  "caveat.streamInterrupted": "audit cut short",

  "coverage.partialChecks": {
    one: "Partial coverage · {count} check unavailable",
    other: "Partial coverage · {count} checks unavailable",
  },
  "coverage.partialCaveat": "Partial coverage · {caveat}",
  "coverage.complete": "Every check in this version completed",

  "focusPath.none": "No keyboard-focusable controls were found on this page.",
  "focusPath.full": "Walked the full tab order: {stops} across {controls}.",
  "focusPath.firstOnly": {
    one: "Checked the first {stops} of {controls}.",
    other: "Checked the first {stops} of {controls}.",
  },
  "focusPath.walkedSome": "Walked {stops} and visited {reached} of {controls}.",
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
    "Partial: focus moved into an iframe or a shadow root, which this version can't see into, so {leftover}.",
  "focusPath.stoppedByTrap": "Partial: focus was trapped at stop {stops}, so {leftover}.",

  "scope.stillMissing":
    "The mobile viewport and reduced motion are still not checked here, so this is not a full audit.",
  "scope.focusPathPending": "Keyboard not checked yet",
  "scope.currentTabKicker": "This tab",
  "scope.skippedNote":
    "The focus path was not checked, so nothing here covers keyboard use. {why} {rest}",
  "scope.partialBadge": "Keyboard check did not start at the first control",
  "scope.partialNote":
    "The focus path could not be taken back to the first control, so these {stops} stops start somewhere inside the page rather than at the beginning of the tab order. {rest}",
  "scope.truncatedBadge": "Keyboard check stopped at {stops} stops",
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
  "summary.needsReview": {
    one: "{count} observation that needs a human check",
    other: "{count} observations that need a human check",
  },
  "evidence.heuristic.title": "Why this is not counted as a failure",
  "evidence.heuristic.body":
    "This is an observation about how the page behaved, not a rule that passes or fails, so it is not counted here. What it would take to settle it is in the description above.",
  "md.needsHumanCheck": "Observations that need a human check",
  "md.needsHumanCheckNote":
    "These come from how the page behaved, not from a rule that passes or fails. They are not counted here, and each one says what would settle it.",
  "standing.blocked": "Critical barriers",
  "standing.blockedNote":
    "At least one barrier stops people using assistive technology from getting through.",
  "standing.failing": "Failing",
  "standing.failingNote": "No critical barriers, but some still make real tasks harder.",
  "standing.gaps": "Minor gaps",
  "standing.gapsNote": "Nothing serious was found automatically. What's left is small.",
  "standing.clean": "No rule failed",
  "standing.cleanNote": "A tool can't see everything, so the items below still need a person.",
  "standing.kicker": "Where this page stands",
  "standing.pending": "Still checking",
  "standing.pendingNote":
    "The first results are in. Keyboard, mobile viewport, expanded menus, motion and live regions are still being checked, and any of them can change where this page stands.",
  "standing.issueCount": {
    one: "{count} {severity} finding",
    other: "{count} {severity} findings",
  },
  "standing.staleTitle": "Scored with an earlier model",
  "standing.staleBody":
    "This result was produced before the current scoring model, which leaves observations out of the count. Its counts and ranking follow the older rules. Audit the page again to score it with the current model.",
  "priority.kicker": "What to fix first",
  "priority.note": "Ordered by how much of the page's remaining weight each group carries.",
  "priority.share": "{share}% of what is left",
  "priority.elements": {
    one: "across {count} element",
    other: "across {count} elements",
  },
  "priority.nothing": "Nothing counts against this page.",
  "summary.remaining": {
    one: " {parts} remains, not counted here.",
    other: " {parts} remain, not counted here.",
  },
  "summary.critical": {
    one: "{count} critical finding stops some people from getting through, so the page cannot meet WCAG level AA. Fix it first.",
    other:
      "{count} critical findings stop some people from getting through, so the page cannot meet WCAG level AA. Fix them first.",
  },
  "summary.serious": {
    one: "No critical barriers{scope}, but {count} serious finding still makes the page harder to use for people who rely on assistive technology.",
    other:
      "No critical barriers{scope}, but {count} serious findings still make the page harder to use for people who rely on assistive technology.",
  },
  "summary.moderatePartial": "Only moderate findings among the checks that ran.",
  "summary.moderate": "Solid result. Only moderate findings are left to polish.",
  "summary.cleanPartial":
    "No scored WCAG failures in the checks that ran. Some checks did not run here, so this doesn't mean the page is free of barriers.",
  "summary.cleanNoFailures": "No scored WCAG failures were found.",
  "summary.excellent": "Excellent. No automated findings on this page.",

  "finding.kind.keyboard": "Keyboard",
  "finding.kind.targetSize": "Target size",
  "finding.kind.reducedMotion": "Reduced motion",
  "finding.kind.liveRegions": "Live regions",
  "finding.kind.context": "Responsive & dynamic",
  "finding.kind.bestPractice": "Best practice",
  "finding.kind.manualReview": "Manual review",
  "finding.contextOnly":
    "Found only in this context ({where}). It does not fail on the first desktop load.",

  "review.generic.how":
    "Automated testing couldn't decide this one, so it needs a person to confirm.",
  "review.generic.s1": "Inspect each affected element in your browser's developer tools",
  "review.generic.s2": "Check it against the WCAG success criterion listed here",
  "review.generic.s3": "Confirm it works as intended for screen reader and keyboard users",

  "review.contrast.how":
    "The checker couldn't read what's behind this text. It's usually a background image, a gradient, a see-through layer, or an element sitting on top.",
  "review.contrast.s1": "Look at the text over its real, rendered background",
  "review.contrast.s2": "Sample the text and background colors with a color picker",
  "review.contrast.s3":
    "Confirm at least 4.5:1 (3:1 for large text, meaning 24px or larger, or 18.66px bold or larger)",

  "review.linkInText.how":
    "Links inside a block of text must be distinguishable without relying on color alone.",
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
    "The visible label and the accessible name differ, which breaks voice control for people who say what they see.",
  "review.nameMismatch.s1": "Compare the visible text with the aria-label / aria-labelledby",
  "review.nameMismatch.s2":
    "Make sure the accessible name contains the visible text, in the same order",
  "review.nameMismatch.s3":
    "Prefer dropping the aria-label and letting the visible text be the name",

  "review.frame.how": "This page embeds an <iframe> that axe can't see into.",
  "review.frame.s1": "Give the <iframe> a short, descriptive title attribute",
  "review.frame.s2": "Audit the embedded page separately, since its content isn't checked here",

  "review.tableHeader.how": "axe couldn't confirm this table header is tied to its data cells.",
  "review.tableHeader.s1": "Confirm it's a real data table, not a layout table",
  "review.tableHeader.s2": "Give each header a scope (col/row), or link cells with headers/id",

  "review.autocomplete.how": "The autocomplete value couldn't be validated automatically.",
  "review.autocomplete.s1": "Check the field's purpose matches a valid autocomplete token",
  "review.autocomplete.s2": "Use standard tokens (name, email, tel, etc.) so browsers can autofill",

  "review.orientation.how": "The page may lock content to a single screen orientation.",
  "review.orientation.s1": "Rotate the device or emulator between portrait and landscape",
  "review.orientation.s2": "Confirm that content and features still work in both orientations",

  "review.pAsHeading.how": "A paragraph is styled to look like a heading (bold or large).",
  "review.pAsHeading.s1": "If it introduces a section, make it a real heading (<h1> to <h6>)",
  "review.pAsHeading.s2": "If it's just emphasized text, this one is safe to dismiss",

  "review.nested.how":
    "An interactive control looks nested inside another (for example, a button inside a link).",
  "review.nested.s1": "Confirm there aren't focusable controls inside other controls",
  "review.nested.s2": "Flatten the markup so each control stands on its own",

  "home.lens.frameLabel": "Screenshot \u00b7 scale 43%",

  "home.md.filename": "accesscheck-aurora-coffee-com.md",
  "home.md.line1": "## aurora-coffee.com · Failing",
  "home.md.line2": "| severity | findings | elements |",
  "home.md.line3": "| serious  | 1 | 7 |",
  "home.md.line4": "| moderate | 2 | 2 |",
  "home.md.line5": "### Fix first",
  "home.md.line6": "1. color-contrast · 1.4.3 · fix tested",

  "focusPath.insideScroller": "inside a scrolling area",
  "capture.markerHint": "Select a mark to open its finding.",
  "detail.sharedColorPair": {
    one: "{count} occurrence shares this detected color pair.",
    other: "{count} occurrences share this detected color pair.",
  },
  "capture.frameLabel": "Screenshot \u00b7 {width} \u00d7 {height}",
  "provenance.engine": "Headless Chromium \u00b7 axe-core with WCAG A & AA rules",
  "provenance.viewportNote": " \u00b7 screenshot taken at {viewport}",
  "provenance.finishedIn": " in {seconds}s",
  "provenance.finishedInStandalone": " \u00b7 finished in {seconds}s",
  "provenance.sandboxNote":
    "Fixes are applied and undone on a copy of the page, so the audited site is never changed.",
  "report.wcagDependsOn": {
    one: "This result covers only what a tool can decide on its own. Meeting WCAG also depends on the manual-review item listed on page 3.",
    other:
      "This result covers only what a tool can decide on its own. Meeting WCAG also depends on the {count} manual-review items listed on page 3.",
  },
  "home.lens.frameLabelFull":
    "Evidence Lens \u00b7 aurora-coffee.com \u00b7 1200 \u00d7 800 \u00b7 scale 43%",

  "capture.notCaptured": "Not captured yet",
  "capture.notAvailable": "Not available",
  "capture.siteAuditNote": "The site audit reads every page without stopping to take screenshots.",
  "capture.failed": "The screenshot could not be taken this time.",
  "capture.runFullNote":
    "The findings for this page are complete. Run the full audit to add the screenshot, the marks and the focus path.",
  "capture.unaffected":
    "The findings for this page are unaffected. Only the screenshot is missing.",
  "capture.runFull": "Run full audit",
  "capture.tryAgain": "Try again",
  "capture.beingTaken": "Screenshot \u00b7 being taken",
  "capture.screenshot": "Screenshot",

  "results.auditedMinutesAgo": "Audited {minutes} min ago",
  "results.auditedAt": "Audited {when}",
  "phase.preparing": "getting ready",
  "phase.loading": "opening the page",
  "phase.auditing": "running the checks",
  "phase.processing": "processing the results",
  "phase.finalizing": "finishing up",
  "results.scanningStatus": "Auditing {url}. Currently {phase}.",
  "report.roadmap.immediateTerm": "Immediate · within 1 week",
  "report.roadmap.immediateTitle": "Resolve critical findings",
  "report.roadmap.immediateBody": {
    one: "Clear the critical finding first. It carries the most weight.",
    other: "Clear the {count} critical findings first. They carry the most weight.",
  },
  "report.roadmap.shortTerm": "Short term · 2 to 4 weeks",
  "report.roadmap.shortTitle": "Address serious findings",
  "report.roadmap.shortBody": {
    one: "Work through the serious finding across templates and shared components.",
    other: "Work through the {count} serious findings across templates and shared components.",
  },
  "report.roadmap.longTerm": "Long term · 1 to 3 months",
  "report.roadmap.longTitle": "Polish and audit again",
  "report.roadmap.longBody":
    "Clear the remaining moderate items, do the manual review, and run the audit again.",
  "report.noModerate": "No moderate findings.",

  "report.phase.preparing": "Starting a browser and getting the page ready.",
  "report.phase.loading": "Opening the page and letting it finish loading.",
  "report.phase.auditing": "Running the WCAG checks on the loaded page.",
  "report.phase.processing": "Grouping findings and matching them to WCAG success criteria.",
  "report.phase.finalizing": "Scoring and putting the report together.",
  "report.freshNote": "The report is built from a fresh audit of this page, run right now.",
  "report.buildFailed": "We couldn't build the report. Try again.",
  "report.buildFailedTitle": "Couldn\u2019t build the report",
  "report.newAudit": "New audit",
  "report.fixFirst": "Fix first",
  "report.buildingStatus": "Building the report for {url}. {detail}",

  "report.wcagLevelsChecked": "WCAG levels checked",
  "report.internalScoreFooter": "Automated audit \u00b7 not a conformance statement",
  "report.pageOf": "WCAG A & AA \u00b7 Page {page} / 3",
  "report.headerTitle": "Accessibility report \u00b7 {host}",
  "report.pagePassed": "The page passed",
  "report.automatedChecks": "automated checks",
  "report.passedLabel": "Passed",
  "report.auditDate": "Audit date",
  "report.auditDuration": "Audit duration",
  "report.elementsChecked": "Elements checked",
  "report.exportedTitle": "Exported accessibility report",
  "report.executiveSummary": "Executive summary",
  "report.priorityRoadmap": "Priority roadmap",
  "report.suggestedFix": "Suggested fix",
  "report.element": "Element",
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
  "results.findingsCount": "Findings \u00b7 {count}",
  "results.nothingToFix": "No automated check found a failure on this page.",
  "chip.fails": "fails {sc}",
  "chip.noFailures": "no failures",
  "chip.notEvaluated": "not evaluated",
  "results.auditedJustNow": "Audited just now",
  "results.backToSite": "Back to site audit",
  "results.siteAudit": "Site audit",
  "results.reauditPage": "Audit this page again",
  "results.reaudit": "Audit again",
  "results.stepsNote": "These are the real steps AccessCheck runs, in the order they happen.",
  "results.partialReport": "Partial report",
  "results.partialNote":
    "This result covers only what we could measure. Anything we skipped is listed below, not guessed.",

  "home.lens.locatedOccurrence": "Located occurrence",
  "home.lens.verifiedInSandbox": "Tested on a copy",
  "home.lens.measurement": "Measurement",
  "home.lens.measuredLabel": "measured",
  "home.lens.minLabel": "vs min",
  "home.lens.shareThisColor": {
    one: "{count} element shares this color",
    other: "{count} elements share this color",
  },
  "home.lens.suggestedFix": "Suggested fix",
  "home.lens.sandbox": "Copy of the page",
  "home.lens.before": "Before",
  "home.lens.after": "After",

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
  "site.startFailed": "We couldn't start the site audit. Try again.",
  "site.startFailedTitle": "Couldn\u2019t start the site audit",
  "site.crawlProgress": "Site audit progress: {done} of {total} pages audited",

  "form.addressLabel": "Website address to audit",
  "form.addressHint": "Enter a web address to audit, like example.com.",
  "form.whatToAudit": "What to audit",

  "results.couldNotOpen": "Couldn't open the page",
  "results.tryAnotherUrl": "Try another address",
  "results.seeWhatWeAudit": "See what we can audit",
  "results.runAgainMoreTime": "Run again with more time",
  "results.quickFromSite": "Quick result from the site audit.",
  "results.showOnScreenshot": "Show on screenshot",
  "results.takingScreenshot": "Taking the screenshot of the page.",

  "site.tryAnotherAddress": "Try another address",
  "site.auditJustThisPage": "Audit just this page",
  "site.listNote":
    "We build the list from the sitemap and the links we can reach, then audit each page.",

  "report.sandboxApplied": "Tested on a copy of the page. The audited site was not changed.",
  "report.whereScoreCouldGo": "Where this page could stand",
  "report.projectionBody":
    "With the critical and serious findings resolved, this page's standing would be",
  "report.accessibilityReport": "Accessibility report",
  "report.detailedFindings": "Detailed findings",
  "report.noSeriousOnPage":
    "No critical or serious automated failures on this page. Moderate items and manual review are on page 3.",
  "report.sectionTwo": "Section 02",

  "wcagReading.notEvaluated": "Not evaluated. AccessCheck runs A and AA",
  "wcagReading.internalNote":
    "This result covers the rules a tool can decide. WCAG conformance also depends on checks that no automated tool can settle on its own.",
  "ratio.minAA": "{value} min AA",
  "ratio.fixedAt": "{value} fixed",
  "ratio.minAAWithFix": "min AA {required}:1 \u00b7 fixed {fixed}:1",
  "ratio.ariaLabel": "Contrast {found} to 1, minimum {required} to 1",
  "ratio.ariaLabelFixed": ", fix reaches {fixed} to 1",
  "score.ariaLabel": "Priority ranking {score} out of 100",
  "home.cta.notConformance": "Automated audit \u00b7 not a conformance statement",

  "home.hero.standards": "axe-core \u00b7 WCAG 2.0 / 2.1 / 2.2 \u00b7 levels A and AA",
  "home.footerStandards": "axe-core \u00b7 Playwright \u00b7 WCAG A & AA",
  "home.cta.standards":
    "AccessCheck \u00b7 axe-core \u00b7 Playwright \u00b7 WCAG 2.0 / 2.1 / 2.2 levels A and AA",
  "home.lens.measureFound": "the measure found",
  "home.lens.exactSelector": "the exact selector",
  "home.lens.reauditedInCopy": "tested on a copy",
  "form.scopePage": "Page",
  "form.scopeSite": "Site",
  "home.hero.title":
    "Every barrier measured, located on the element, and tested before it's suggested.",
  "home.hero.passes": "+ keyboard, viewport and motion checks",
  "home.hero.body":
    "It's not just a report. It's a visual inspector: paste a web address and every finding comes tied to the element that caused it, with the contrast ratio, the selector and a fix tested on a copy of the page.",
  "home.hero.lensNote":
    "Select a finding and its mark lights up. Click the mark and the details open: the screenshot, the measurement and the code in one place.",
  "home.lens.title": "See the barrier on the element that caused it",
  "home.lens.body":
    "Element, selector, measurement and diagnosis stay connected. Select a finding and its mark fills in. The located element is labeled with the ratio, and the others keep a dashed outline, so you can tell them apart without relying on color.",
  "home.lens.contrastStory":
    "The white text on the light-green button disappears for people with low vision, or for anyone in bright sunlight. And this is the checkout button.",
  "home.lens.sandboxNote": "Tested on a copy of the page. aurora-coffee.com was not changed.",
  "home.form.exportNote": "Export as PDF or Markdown",
  "home.demo.roasted": "Roasted in Porto every Tuesday and shipped the same week.",
  "home.demo.navMenu": "Menu",
  "home.demo.navBeans": "Beans",
  "home.demo.headline": "Slow-roasted,",
  "home.demo.headlineRest": "small batch, since 2011",
  "home.demo.order": "Order now",

  "home.mostRecent": "Most recent public audit \u00b7 where the page stands",
  "home.auditSite": "Audit site",
  "home.auditPage": "Audit page",
  "home.timing": "About 10 to 25 seconds per page",
  "home.quickExamples": "Quick examples:",
  "home.stage.open": "Open",
  "home.stage.locate": "Locate",
  "home.stage.verify": "Test",
  "home.stage.browserReady": "Chromium \u00b7 axe-core injected \u00b7 content settled",
  "home.axeRules.kicker": "axe-core rules",
  "home.axeRules.note": "pass or fail, objectively",
  "home.axeRules.countLine1": "success criteria",
  "home.axeRules.countLine2": "checked automatically",
  "home.complementary.kicker": "complementary checks",
  "home.complementary.note": "what a tool can't judge alone",
  "home.complementary.countLine1": "checks beyond",
  "home.complementary.countLine2": "the static DOM",

  "results.checksPassedLabel": "automated checks passed",
  "results.stillChecking": "still checking…",
  "results.focusOnContainer": "check focus",
  "results.measuredNeeds": "{measured}:1 \u00b7 needs {required}:1",
  "results.runFullAuditNote":
    "The screenshot, the keyboard checks and fix testing come with the full audit.",
  "results.siteAuditPassNote":
    "From the site audit: axe rules plus AccessCheck's own checks. The keyboard check, expanded content and fix testing run in the full page audit.",
  "wcagReading.failsBy": "Fails by",

  "home.howItWorks.kicker": "How it works",
  "home.howItWorks.title": "Open the page, locate the problem, test the fix",
  "home.checks.kicker": "Checks included",
  "home.checks.title": "Every automated rule, plus the checks a rules engine can't do alone",
  "home.sandbox.kicker": "Tested on a copy",
  "home.sandbox.title": "Every fix is tested on a copy, so your site is never touched",
  "home.sandbox.body":
    "We apply the change to a copy of the page, run the check again, then undo it. If the problem no longer shows up, the fix is marked as tested. That is not a guarantee, and your real site is never touched.",
  "home.sandbox.nearestPassing": "nearest passing lightness, same hue",
  "home.sandbox.measurement": "Contrast measurement \u00b7 1.4.3 AA",
  "home.sandbox.found": "found \u00b7 minimum for normal text is {required}:1",
  "home.export.kicker": "Export",
  "home.export.title":
    "Two exports for two readers: the person who decides and the person who fixes",
  "home.export.pdfFor": "for the person who decides",
  "home.export.pdfTitle": "Standing, priorities and impact in plain language",
  "home.export.pdfBody":
    "Summary, severity levels and each finding's impact on people. Ready to send to a client or a product team, with no engineering context required.",
  "home.export.mdFor": "for the person who fixes",
  "home.export.mdTitle": "Selector, snippet and fix status",
  "home.export.mdBody":
    "A severity table and a prioritized list, ready to paste into a ticket or a pull request, with the tested fixes already marked.",

  "home.cta.measured": "Measured",
  "home.cta.located": "Located",
  "home.cta.verified": "Tested",
  "home.cta.title": "Audit a page now and see where each barrier is",
  "home.cta.body":
    "The report is ready in under half a minute and exports as PDF or Markdown.",
  "home.form.useExtension": "Audit the tab you are on with the Chrome extension",
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
    "Contrast ratio, selector, code snippet and position on the screenshot. Repeated findings are grouped, so one fix can cover several elements at once.",
  "home.step3.title": "Each fix is tested before we suggest it",
  "home.step3.body":
    "We apply the change to a copy of the page, run the check again, then mark the fix as tested or as needing review.",

  "home.example.title": "Text below the minimum contrast",
  "home.example.summary":
    "No critical barriers, but 1 serious finding still makes the page harder to use for people who rely on assistive technology.",

  "impact.contrast":
    "People with low vision or reduced contrast sensitivity may be unable to read this text, especially on low-quality screens or in bright light.",
  "impact.alt":
    "Screen reader users get nothing where this image should carry meaning. They hear a file name, or silence, instead of the content.",
  "impact.name":
    "Screen reader users hear only the element's type (“link”, “button”, “edit”) with no idea what it does, so they can't decide whether to activate it.",
  "impact.lang":
    "Screen readers pick the wrong pronunciation rules, so the page is read aloud in the wrong accent or language and can become unintelligible.",
  "impact.title":
    "The page title is the first thing a screen reader announces, and the label shown in tabs, history and bookmarks. Without it, people can't tell pages apart.",
  "impact.zoom":
    "Blocking pinch-zoom stops low-vision users from enlarging the text, which many rely on to read at all on a phone.",
  "impact.headingOrder":
    "Screen reader users move through a page by heading level, so a skipped or out-of-order level makes the structure misleading and hides where sections begin.",
  "impact.headingOne":
    "Without a top-level heading, screen reader users have no reliable landmark for “what this page is about” and can't jump to the main content by heading.",
  "impact.landmark":
    "Landmark regions let screen reader users jump straight to navigation, main content or the footer. Content outside them can only be reached by reading everything in order.",
  "impact.list":
    "Screen readers announce “list, N items” and let users skip it. Broken list markup loses that count and the ability to move item by item.",
  "impact.aria":
    "Incorrect or incomplete ARIA makes assistive technology announce the wrong role or state, which is often worse than no ARIA at all.",
  "impact.duplicateId":
    "Duplicate ids break the links between labels, controls and ARIA references, so the wrong element gets announced or activated.",
  "impact.frame":
    "Screen reader users hear an unlabeled frame with no idea what it contains, so they may skip important embedded content.",
  "impact.focusVisible":
    "Sighted keyboard users lose track of where they are on the page when the focus indicator disappears, and can't tell which control they're about to activate.",
  "impact.focusOrder":
    "When Tab order doesn't follow the visual order, keyboard and screen reader users are thrown around the page and can miss or repeat content.",
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
    "Screen reader users miss updates like errors, confirmations and counts, because the region that should announce them isn't set up to.",
  "impact.generic":
    "People who use assistive technology hit a barrier here that sighted mouse users don't, so the same task is harder or impossible for them.",

  "fix.describeField": "Describe this field",
  "fix.describeControl": "Describe this control",
  "fix.descriptivePageTitle": "Descriptive page title",
  "fix.labelWithId":
    'This {tag} has no accessible name. Add a <label> linked by its id ("{id}") so screen readers announce it.',
  "fix.labelNoId":
    "This {tag} has no id to bind a <label> to. Add an aria-label (or give it an id and a <label for>) so it has an accessible name.",
  "fix.htmlLang":
    "The <html> element has no lang attribute, so assistive technology can't tell which language to read. Set it to the page's primary language.",
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
  "fix.contrastHueKept": " The hue stays the same. Only the lightness changes.",
  "fix.contrastHueShifted":
    " (the hue is shifted toward neutral to reach the needed contrast on this background)",
  "fix.contrastForeground":
    "Replace text color {from} with {to} \u2192 {ratio}:1 against {bg} {was}.{hueNote}",
  "fix.contrastAlsoBackground": " Or keep the text and set the background to {bg}.",
  "fix.contrastBackground":
    "Text color {fg} can't reach {required}:1 on {bg} by changing the text alone. Set the background to {newBg} instead → {ratio}:1 {was}. The background hue stays the same. Only its lightness changes.",
  "fix.contrastNeither":
    "Text color {fg} on {bg} reaches only {measured}:1 (needs {required}:1). Neither the text nor the background clears it by lightness alone on these hues, so pick a darker or lighter pairing.",

  "fix.headingOne.action":
    "Add one <h1> that describes the page's main purpose, at the start of the primary content, before the introductory text.",
  "fix.headingOne.caution":
    "Don't add an empty or visually hidden heading only to silence the rule unless that truly matches the page structure.",
  "fix.headingOrder.action":
    "Change the flagged heading so levels only ever increase by one (h2 to h3, never h2 to h4). Renumber for structure, not for visual size, and use CSS to size it.",
  "fix.headingOrder.caution":
    "Never skip a level to get a smaller font. Style the correct level instead.",
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
    "Don't rely on a color change alone. Keep a visible outline or box-shadow.",
  "fix.focusOrder.action":
    "Put the elements in the DOM in the order people should Tab through them, and remove positive tabindex values so focus follows the source order.",
  "fix.keyboardTrap.action":
    "Make sure focus can leave the widget with Tab / Shift+Tab (and Esc for dialogs). Manage focus in JS so it returns to a sensible place when the widget closes.",
  "fix.tabindex.action":
    'Remove tabindex values greater than 0. Use tabindex="0" to make a custom control focusable, or -1 to focus it from code. Never use positive numbers.',
  "fix.reachable.action":
    'Make each control a natively focusable element: use <button>/<a> instead of a clickable <div>, or add tabindex="0" plus keyboard handlers to the custom control.',
  "fix.targetSize.action":
    "Give the target at least 24\u00d724px of hit area (44\u00d744 is safer on touch), or leave enough spacing around it. Pad the control rather than only enlarging an icon.",
  "fix.motion.action":
    "Wrap non-essential animation in a prefers-reduced-motion media query so it's turned off for people who asked for less motion.",
  "fix.live.action":
    'Announce dynamic updates through a live region: put status text in an element with aria-live="polite" (or role="status"), and errors in aria-live="assertive".',

  "marker.bestPractice":
    "Best practice, reported as coverage. It is not tied to one positioned element.",
  "marker.context":
    "Found in a different context (mobile size or an opened state), so it is not on any desktop screenshot.",
  "marker.keyboard":
    "From the keyboard check, so it appears on the focus path instead of as a mark.",
  "marker.docLevel":
    "Applies to the whole document or page structure, not a single positioned element.",
  "marker.shadowRoot":
    "The affected element sits inside a shadow root, which the marks on the page do not reach.",
  "marker.offCapture":
    "The affected element sits in a part of the page no screenshot in this report covers, is hidden, or has no visible box.",

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

  "severity.criticalDesc": "Blocks access outright for some people who use assistive technology.",
  "severity.seriousDesc": "Major barrier. Many people can't complete the task.",
  "severity.moderateDesc": "Noticeable friction, but the task stays possible.",
  "severity.minorDesc": "Small polish item with limited impact.",

  "ssrf.privateAddress":
    "This address is a private or internal one, so we can't audit it. Enter a public web page instead.",
  "ssrf.invalidAddress": "That doesn't look like a valid web address. Check it and try again.",
  "ssrf.onlyHttp": "Only web pages (addresses starting with http or https) can be audited.",
  "ssrf.notFound": "We couldn't find a site at that address. Check the spelling and try again.",
  "report.projectionCaveat":
    ". This is only a projection, not a pass for WCAG. Meeting WCAG also depends on the moderate items and on manual review.",
  "report.recommendations": "Recommendations",
  "report.wcagDisclaimer":
    "AccessCheck runs axe-core against WCAG levels A and AA (2.0, 2.1 and 2.2). Automated testing covers only some of the WCAG success criteria. The rest need a person to review, often with a screen reader or other assistive technology. Level AAA is not checked, and this report is not a statement of conformance.",
  "report.findingsIntro":
    "Each finding grouped by severity and mapped to its WCAG A/AA success criterion, with the impact on people, the measurement where there is one, and a fix tested on a copy of the page.",

  "site.theSite": "the site",
  "site.notFound": "Site audit not found.",
  "context.recheckShort": "Check this element again where it failed.",
  "context.recheckLong": "Check this element again where it failed. No fix was tested here.",

  "wcagReading.noA": "No automated level-A failures",
  "wcagReading.noAA": "No automated level-AA failures",
  "provenance.title": "Provenance",
  "provenance.complementary":
    "Complementary checks: keyboard, mobile viewport, expanded UI, motion, live regions.",
  "stepper.previous": "Previous occurrence",
  "stepper.next": "Next occurrence",
  "stepper.position": "Occurrence {at} of {total}",
  "seal.verified": "Fix tested: applied for a moment, and the rule passed",
  "seal.needsReview": "Needs review: the suggestion alone doesn't clear it",

  "site.score": "Site score",
  "site.runningAverage": "running average across audited pages",
  "site.finalAverage": "average across all audited pages",
  "site.newAuditTitle": "Start a new audit",
  "site.newAudit": "New audit",
  "site.fullAudit": "Full-site accessibility audit",
  "site.auditFailed": "Audit failed",
  "site.noAutomatedFindings": "No automated findings",
  "site.noFindings": "No findings",
  "site.pageFailed": "This page could not be audited.",

  "severity.critical": "Critical",
  "severity.serious": "Serious",
  "severity.moderate": "Moderate",
  "severity.minor": "Minor",

  "detail.sampleText": "Sample text",
  "detail.largeText": " (large text)",
  "detail.verifiedOnElement": "Fix tested on this element",
  "detail.verifiedOnElementNote":
    "Passes WCAG AA: applied to this element for a moment and checked again",
  "detail.calculatedNote":
    "Would reach {ratio}:1, calculated from the detected colors, not tested on the page",
  "detail.rule": "Rule",
  "detail.technicalSelector": "Selector",
  "detail.humanDecision":
    "The right change depends on the page's structure, so confirm it in context.",
  "detail.sandboxNote": "Fixes are tested on a copy of the page. {host} was not changed.",
  "detail.pageNote":
    "The change was applied to this page for a moment, then put back exactly as it was.",

  "verdict.label.verified": "Fix tested",
  "verdict.label.needsReview": "Needs review",

  "verdict.others": {
    one: "The other occurrence shares the same suggestion but was not tested on its own.",
    other:
      "The other {count} occurrences share the same suggestion but were not tested one by one.",
  },
  "verdict.verifiedShared":
    "Applied for a moment to each of the {count} occurrences, and the rule passed on all of them.",
  "verdict.verifiedSingle": "Applied for a moment, and the rule passed.",
  "verdict.partial":
    "Tested on each occurrence, then undone: {cleared} of {total} passed and {failed} did not. Review the ones that still fail.",
  "verdict.sampledOne":
    "The sampled element passed when the suggested change was applied and the rule was run again. {others}",
  "verdict.sampledMany":
    "Tested {reaudited} of {total} occurrences, one for each suggested fix, then undid the change: {cleared} passed{failedTail}. {others}",
  "verdict.sampledFailedTail": " and {failed} did not",
  "verdict.failedSubjectSingle": "This element",
  "verdict.failedSubjectSampled": "The sampled element",
  "verdict.failedMeasured":
    "{subject} still fails after the suggested change: the new color reaches {ratio}:1 against the sampled background, but the rule still flags it. The real background may be an image, gradient or overlapping layer.{tail}",
  "verdict.failedPlain": "{subject} still fails with the change applied. Review it by hand.{tail}",
  "verdict.unverifiable":
    "This fix couldn't be tried on the page, because the element was gone or there was no time left. Check it by hand.",
  "verdict.contextual":
    "This suggestion clears the rule, but only a person can judge whether it says the right thing for this page.",
  "verdict.noAutoFix":
    "No automatic fix applies here. The right change depends on the page, so it needs a person.",
  "verdict.bestPractice":
    "Best practice, not a WCAG success criterion. Worth fixing, but it doesn't count toward the WCAG result.",
  "verdict.complementary": "Fix it, then audit again to confirm.",

  "keyboard.region.offscreen": "outside the visible viewport",
  "keyboard.region.top": "near the top of the viewport",
  "keyboard.region.middle": "in the middle of the viewport",
  "keyboard.region.bottom": "near the bottom of the viewport",

  "keyboard.invisible.noOutline": "no outline ({style}, {width})",
  "keyboard.invisible.boxShadow": "box-shadow unchanged ({value})",
  "keyboard.invisible.border": "border unchanged ({width} {color})",
  "keyboard.invisible.background": "background unchanged ({value})",
  "keyboard.invisible.component":
    "nothing around it changed either, including its container and its ::before and ::after",
  "keyboard.invisible.reason": "Focus reached this element and nothing on screen changed.",
  "keyboard.invisible.measured": "{unchanged}.",
  "keyboard.invisible.title": {
    one: "No visible focus indicator on {count} element",
    other: "No visible focus indicator on {count} elements",
  },
  "keyboard.invisible.desc": {
    one: "People who use a keyboard can't see where they are on the page.",
    other: "People who use a keyboard can't see where they are on the page.",
  },
  "keyboard.invisible.fix":
    "Give it a visible :focus-visible style, such as outline: 2px solid with outline-offset: 2px, instead of removing the outline.",

  "keyboard.unclear.title": {
    one: "{count} focus indicator needs a human check",
    other: "{count} focus indicators need a human check",
  },
  "keyboard.unclear.desc": {
    one: "Focus reached this element, but the element itself didn't change. Something around it may have, so check it by eye.",
    other:
      "Focus reached these elements, but they didn't change themselves. Something around them may have, so check them by eye.",
  },
  "keyboard.unclear.fix":
    "Tab to each one and look. If the highlight doesn't clearly point at the focused control, give the control its own :focus-visible style.",
  "keyboard.unclear.opaque":
    "Focus moved inside this element's shadow root, which this version can't read, so any indicator in there wasn't measured.",
  "keyboard.unclear.occurrence": {
    one: "The element didn't change. Only {container} did, and it also holds {count} other control.",
    other:
      "The element didn't change. Only {container} did, and it also holds {count} other controls.",
  },

  "keyboard.jump.up": "focus moved back up the page",
  "keyboard.jump.back": "focus moved back to the left on the same line",
  "keyboard.jump.where": ', from {fromRegion} ("{fromLabel}") to {toRegion} ("{toLabel}")',
  "keyboard.jump.whereLabels": ', from "{fromLabel}" to "{toLabel}"',
  "keyboard.jump.measured": "From the top of the viewport: {from}px to {to}px.",
  "keyboard.jump.measuredDown": "Down the page: {from}px to {to}px.",
  "keyboard.jump.measuredAcross": "Across the page: {from}px to {to}px.",
  "keyboard.jump.measuredFromLeft": "From the left of the viewport: {from}px to {to}px.",
  "keyboard.jump.reason": "From stop {from} to stop {to}, {movement}{where}.",

  "keyboard.trap.title": "Keyboard focus is trapped",
  "keyboard.trap.desc":
    "Pressing Tab left focus on the same element. Keyboard and screen reader users can get stuck here with no way out.",
  "keyboard.trap.fix":
    "Make sure the element doesn't capture Tab. If it's a dialog, let Esc close it and send focus back to the control that opened it.",
  "keyboard.trap.occurrence":
    "Tab was pressed here and focus didn't move, so the check couldn't go any further.",

  "keyboard.unreachable.title": {
    one: "{count} interactive control can't be reached by keyboard",
    other: "{count} interactive controls can't be reached by keyboard",
  },
  "keyboard.unreachable.desc": {
    one: "{count} element acts like a control, with a click handler or an ARIA role, but Tab never reaches it. Only mouse users can use it.",
    other:
      "{count} elements act like controls, with click handlers or ARIA roles, but Tab never reaches them. Only mouse users can use them.",
  },
  "keyboard.unreachable.fix":
    'Use a native control such as <button> or <a href>, or add tabindex="0" and keyboard handlers so people can reach it and use it.',
  "keyboard.unreachable.occurrence":
    "This element acts like a control, but Tab never landed on it. Check whether it's meant to be usable.",

  "keyboard.order.title": {
    one: "Focus order jumps out of sequence {count} time",
    other: "Focus order jumps out of sequence {count} times",
  },
  "keyboard.order.desc":
    "The Tab order doesn't follow the order people read the page, so focus jumps back or up. Whether a jump is a problem depends on the order the page intends, so check each one by eye.",
  "keyboard.order.fix":
    "Make the DOM order match the visual order, and avoid reordering with CSS (order, row-reverse, absolute positioning) or a positive tabindex.",

  "keyboard.tabindex.title": {
    one: "{count} element uses a positive tabindex",
    other: "{count} elements use a positive tabindex",
  },
  "keyboard.tabindex.desc":
    "A positive tabindex overrides the natural tab order and usually makes focus jump around in confusing ways.",
  "keyboard.tabindex.fix":
    'Replace positive values with tabindex="0", or remove the attribute, and let the DOM order set the sequence.',
  "keyboard.tabindex.occurrence":
    "This element has a positive tabindex, so it gets focus before elements that come earlier on the page.",

  "stage.structure": "Checking page structure",
  "stage.rules": "Running accessibility rules",
  "stage.focus": "Walking the focus path",
  "stage.report": "Preparing the report",

  "panel.backToSummary": ", back to the summary",
  "panel.count.manualReview": "manual review",
  "panel.toFix": { one: "{count} to fix", other: "{count} to fix" },
  "panel.toCheck": { one: "{count} to check by hand", other: "{count} to check by hand" },
  "panel.notOnScreen": {
    one: "1 finding to fix has no mark on screen right now. Open it from the list to find it.",
    other:
      "{count} findings to fix have no mark on screen right now. Open them from the list to find them.",
  },
  "panel.wholePage": {
    one: "1 finding to fix applies to the whole page, so it has no mark.",
    other: "{count} findings to fix apply to the whole page, so they have no mark.",
  },
  "panel.inShadowRoot": {
    one: "1 finding to fix is inside a shadow root, which the marks can't reach.",
    other: "{count} findings to fix are inside a shadow root, which the marks can't reach.",
  },

  "panel.screenshot": "Screenshot of the visible page",
  "panel.evidenceNote": "viewport screenshot",
  "panel.evidenceNoteMarked": "viewport screenshot · {count} marked",
  "panel.screenshotAlt": "Screenshot of {url}",

  "panel.copied": "Copied",
  "panel.copyFailed": "Copy failed",
  "panel.copySelector": "Copy selector",
  "panel.copyHtml": "Copy HTML",

  "panel.neverReached": "Never reached by Tab",
  "panel.stopN": "Stop {n}",
  "panel.geometryUnsure":
    "The layout alone can't settle this one. Compare it with the reading order you intend.",
  "panel.position": "Position",
  "panel.measured": "Measured",
  "panel.positionValue": "{w}×{h}px at {x}, {y}",
  "panel.offViewport": " · outside the viewport when it was measured",
  "panel.selector": "Selector",
  "panel.html": "HTML",
  "panel.abbreviated":
    "Shortened with …, and attributes that may hold what you typed are left out. This is evidence, not code to paste back.",
  "panel.locating": "Looking for it…",
  "panel.locate": "Locate on page",

  "panel.alsoFailsIn": "Also fails in {contexts}",
  "panel.whatToChange": "What to change",
  "panel.details": "Details",
  "panel.problemNavigation": "Move between findings",
  "panel.previousProblem": "Previous finding",
  "panel.nextProblem": "Next finding",
  "panel.group.fix": "To fix",
  "panel.group.check": "To check by hand",
  "panel.group.recommend": "Recommendations",
  "panel.howToCheck": "How to check",
  "panel.readingLanguage":
    "This result is in {language}. Audit the page again to get it in this language.",
  "panel.noFailures": "None of the checks in this version found a failure.",

  "panel.checksPerformed": "Checks performed",
  "panel.check.primed":
    "Scrolled through the page first so content that appears on scroll was read",
  "panel.check.axe": "axe-core, WCAG A and AA (2.0, 2.1, 2.2) plus best practice",
  "panel.check.targetSize": "Target size (WCAG 2.5.8)",
  "panel.check.liveRegions": "Live regions (WCAG 4.1.3)",
  "panel.check.screenshot": "Screenshot of the visible viewport",
  "panel.check.focusPath": "Focus path with real Tab presses",
  "panel.check.focusPathStopped": "Focus path with real Tab presses (stopped early)",

  "panel.mark.stop": "stop",

  "panel.focusPath": "Focus path",
  "panel.showFocusPath": "Inspect tab order",
  "panel.previousStop": "Previous stop",
  "panel.nextStop": "Next stop",
  "panel.stopOf": "Stop {at} of {total}",
  "panel.showComplete": "Show complete path",
  "panel.exitInspection": "Exit",
  "panel.drawingAll":
    "Every stop is drawn. The current one is highlighted and the rest are dimmed.",
  "panel.drawingWindow":
    "Drawing the current stop and {neighbours} either side, so the page stays readable.",
  "panel.walkingFocusPath": "Walking the focus path",
  "panel.runningNoteFocus":
    "Chrome shows a banner while the debugger is attached. The debugger is released before the report comes back, and the page is not changed.",
  "panel.walkDebuggerNote":
    "Walking the tab order uses Chrome's debugger. While it runs, Chrome shows a banner and DevTools can't attach to this tab. The debugger is released as soon as the walk ends.",
  "panel.walkNow": "Check keyboard",
  "panel.roundChecked": {
    one: "This round checked {count} stop.",
    other: "This round checked {count} stops.",
  },
  "panel.roundProblems": {
    one: "{count} keyboard finding was added to the list.",
    other: "{count} keyboard findings were added to the list.",
  },
  "panel.roundNoProblems": "No keyboard findings so far.",
  "panel.showKeyboardProblems": "Show keyboard findings",
  "panel.continueWalk": "Continue where it stopped",
  "panel.continueWalkNote": "Picks up at stop {stops} and keeps going, without starting over.",

  "panel.auditingTab": "Auditing this tab",
  "panel.runningNote":
    "The result appears when every step above has finished. Any change made to test a fix is undone in the same moment.",
  "panel.announceStep": "Auditing. Step {n}: {stage}.",

  "panel.coverageLimitations": "Coverage limitations",
  "panel.notChecked": "Not checked in this version",
  "panel.notCheckedNote": "A result from this version never means the page is free of barriers.",
  "panel.auditAgain": "Audit this tab again",
  "panel.reaudit": "Audit again",
  "panel.aboutAudit": "About this audit",

  "panel.idleTitle": "Nothing audited yet",
  "panel.idleBody":
    "Click the AccessCheck icon in the toolbar to audit the page you're on. Once the report is ready, you can also check the keyboard, which uses Chrome's debugger. Nothing leaves your browser.",
  "panel.unsupportedKicker": "Not supported here",
  "panel.unsupportedTitle": "This page cannot be audited",
  "panel.errorKicker": "Audit failed",
  "panel.errorTitle": "The audit could not finish",
  "panel.tryAgain": "Try again",

  "panel.pageUnreachable": "The page could not be reached from here.",
  "panel.elementGone":
    "That element is no longer on the page. The DOM changed after the audit ran.",
  "panel.someStopsGone":
    "{missing} of {total} stops are no longer on the page, so they could not be drawn.",
  "panel.someStopsOffScreen":
    "{offScreen} of {total} stops are outside the viewport right now, so only the rest are drawn.",

  "chain.investigation": "Finding {n}",
  "chain.located": "Located",
  "chain.measured": "Measured",
  "chain.evidence": "Evidence",
  "chain.change": "Change",
  "chain.decide": "A person decides",
  "chain.end.tested": "Fix tested",
  "chain.end.failed": "Still fails with the change",
  "chain.end.person": "A person decides",
  "chain.end.fixPerson": "The fix needs a person",
  "chain.end.recheck": "Confirm with a new audit",
  "chain.end.untested": "Fix not tested",
  "chain.testedOnCopy": "Tested on a copy of the page.",
  "chain.testedOnPage": "Tested on this page, then undone.",
  "chain.notRemeasured":
    "This element takes the change tested on another one, but was not measured again itself.",
  "chain.howVerified": "How this was tested",
  "chain.heardAs": "Screen readers say",
  "chain.role.button": "button",
  "chain.role.link": "link",
  "chain.role.field": "field",
  "chain.role.image": "image",
  "chain.noName": "no name",
  "chain.onThePage": "On the page",
  "chain.withChange": "With the change",
  "chain.needed": "needed",
  "chain.passes": "passes {required}:1",
  "chain.atRest": "At rest",
  "chain.withFocus": "With focus",
  "chain.noDifference": "No visible difference",
  "chain.ringShould": "The ring that should appear",
  "chain.notOnCapture": "Found on the page, not marked on any screenshot.",
  "chain.notOnCaptureHere": "{tag} was found on the page but is not marked on any screenshot.",
  "chain.occurrences": "Occurrences",
  "chain.occurrenceAria": "Occurrence {tag}: {label}",
  "chain.unlisted": {
    one: "1 more element has the same problem but isn't listed separately.",
    other: "{count} more elements have the same problem but aren't listed separately.",
  },
  "chain.closeUp": "Close-up of {label}",
  "chain.offAbove": "Above what the page shows now",
  "chain.offBelow": "Below what the page shows now",
  "chain.notShowing":
    "This element is on the page but not showing right now, often because it sits in a closed menu, drawer or dialog. Open it and press Locate on page again.",
  "chain.gap.name": "name missing",
  "chain.gap.alt": "alt missing",
  "chain.gap.ring": "nothing shows focus",
  "chain.gap.unmeasured": "not measured",
  "chain.status.tested": "fix tested",
  "chain.status.person": "a person decides",
  "chain.status.fixPerson": "needs a person",
  "chain.status.recheck": "audit again to confirm",
  "chain.status.failed": "still fails",
  "summary.recommendations": { one: "1 recommendation", other: "{count} recommendations" },
  "summary.passed": { one: "1 rule passed", other: "{count} rules passed" },
  "summary.index": "Findings by number",
  "layers.label": "Marks",
  "layers.findings": "Findings",
  "layers.path": "Focus path",
  "layers.none": "None",
  "marks.group": "Marks on the screenshot. Use the arrow keys to move between them.",
  "marks.finding": "Finding {n}, {kind}: {title}",
  "marks.occurrence": "Finding {n}, occurrence {i} of {total}: {title}",
  "marks.stopNoFocus": "Focus stop {n}: {label}, nothing shows focus",
  "marks.stopLabel": "Focus stop {n}: {label}",
  "marks.stopWithFinding": "{stop}, finding {tag}",
  "focusPath.sequence": {
    one: "1 stop, in the order Tab reaches it",
    other: "{count} stops, in the order Tab reaches them",
  },
  "focusPath.related": "Finding {tag}",
  "focusPath.stopNoFocus": "nothing shows focus",
  "unit.finding": { one: "{count} finding", other: "{count} findings" },
  "wcag.2.1.2": "No Keyboard Trap",
  "wcag.2.4.3": "Focus Order",
  "context.opened": "with “{label}” open",
  "context.disclosure": "Disclosure",
  "context.menu": "Menu",
  "context.mobileViewport": "{width}px viewport",
  "report.levelsValue": "A & AA · 2.0 / 2.1 / 2.2",
  "report.effortImpact": "Effort: {effort} · Impact: {impact}",
  "report.impactTag": "{impact} impact",
  "report.effort.quick": "quick",
  "report.effort.moderate": "moderate",
  "report.effort.involved": "involved",
  "report.impact.high": "high",
  "report.impact.medium": "medium",
  "report.impact.low": "low",
  "report.moreModerate": {
    one: "+ {count} more moderate finding",
    other: "+ {count} more moderate findings",
  },
  "report.moreInFullReport": "+ {count} more in the full report",
  "report.measuredMinimum": "Measured {measured}:1 · minimum AA {required}:1",
  "site.auditingProgress": "Auditing {done} of {total}",
  "site.done": { one: "Done · {count} page", other: "Done · {count} pages" },
  "site.scoreLabel": "Site score {score} out of 100",
  "site.pagesAudited": { one: "page audited", other: "pages audited" },
  "site.pagesFailed": { one: "{count} page failed", other: "{count} pages failed" },
  "site.pageScoreLabel": "Score {score} out of 100",
  "site.pageWaiting": "Waiting…",
  "site.pageAuditing": "Auditing…",
  "site.openReport": "Open the report for {path}",
  "site.stillQueued": {
    one: "{count} page still in the queue…",
    other: "{count} pages still in the queue…",
  },
  "site.findingPagesStatus": "Finding pages to audit on {host}.",
  "ruler.progressLabel": "Audit progress: {elapsed}s of up to {budget}s",
} satisfies Record<string, Message>;

export type Catalog = typeof en;
