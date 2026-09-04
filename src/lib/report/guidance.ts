/**
 * Presentation guidance: the concrete human impact and an actionable fix per
 * finding category. The engine already produces concrete fixes for contrast,
 * alt, labels, names, lang, title and viewport (remediate.ts) — those are shown
 * verbatim. This module fills the gap for structural rules whose engine text
 * only restates the rule, and rewrites impact copy from "what the rule requires"
 * into "what happens to people".
 *
 * Nothing here invents page-specific selectors, elements or values.
 */

export type FixExample = { lang: "html" | "css"; code: string };

export type Guidance = {
  action: string;
  example?: FixExample;
  caution?: string;
  humanDecision?: boolean;
};

export type Category =
  | "contrast"
  | "alt"
  | "name"
  | "lang"
  | "title"
  | "zoom"
  | "heading-order"
  | "heading-one"
  | "landmark"
  | "list"
  | "aria"
  | "duplicate-id"
  | "frame"
  | "focus-visible"
  | "focus-order"
  | "keyboard-trap"
  | "tabindex"
  | "reachable"
  | "target-size"
  | "motion"
  | "live"
  | "generic";

const RULE_CATEGORY: Record<string, Category> = {
  "color-contrast": "contrast",
  "color-contrast-enhanced": "contrast",
  "image-alt": "alt",
  "input-image-alt": "alt",
  "area-alt": "alt",
  "role-img-alt": "alt",
  label: "name",
  "select-name": "name",
  "link-name": "name",
  "button-name": "name",
  "input-button-name": "name",
  "aria-command-name": "name",
  "aria-input-field-name": "name",
  "aria-toggle-field-name": "name",
  "html-has-lang": "lang",
  "html-lang-valid": "lang",
  "valid-lang": "lang",
  "document-title": "title",
  "meta-viewport": "zoom",
  "meta-viewport-large": "zoom",
  "heading-order": "heading-order",
  "empty-heading": "heading-order",
  "page-has-heading-one": "heading-one",
  region: "landmark",
  "landmark-one-main": "landmark",
  "landmark-unique": "landmark",
  "landmark-complementary-is-top-level": "landmark",
  list: "list",
  listitem: "list",
  dlitem: "list",
  "definition-list": "list",
  "aria-required-attr": "aria",
  "aria-allowed-attr": "aria",
  "aria-required-children": "aria",
  "aria-required-parent": "aria",
  "aria-roles": "aria",
  "aria-valid-attr": "aria",
  "aria-valid-attr-value": "aria",
  "duplicate-id": "duplicate-id",
  "duplicate-id-active": "duplicate-id",
  "duplicate-id-aria": "duplicate-id",
  "frame-title": "frame",
  // keyboard pass ids
  "focus-not-visible": "focus-visible",
  "focus-order": "focus-order",
  "keyboard-trap": "keyboard-trap",
  "positive-tabindex": "tabindex",
  "unreachable-control": "reachable",
};

export function categoryOf(ruleId: string, kind?: string): Category {
  if (RULE_CATEGORY[ruleId]) return RULE_CATEGORY[ruleId];
  if (kind === "target-size") return "target-size";
  if (kind === "reduced-motion") return "motion";
  if (kind === "live-regions") return "live";
  return "generic";
}

const IMPACT: Record<Category, string> = {
  contrast:
    "People with low vision or reduced contrast sensitivity may be unable to read this text, especially on low-quality screens or in bright light.",
  alt: "Screen-reader users get nothing where this image should carry meaning. They hear a file name, or silence, instead of the content.",
  name: "Screen-reader users hear only the element's type (“link”, “button”, “edit”) with no idea what it does, so they can't decide whether to activate it.",
  lang: "Screen readers pick the wrong pronunciation rules, so the page is read aloud in the wrong accent or language and can become unintelligible.",
  title: "The page title is the first thing a screen reader announces, and the label shown in tabs, history and bookmarks. Without it, people can't tell pages apart.",
  zoom: "Blocking pinch-zoom stops low-vision users from enlarging the text, which many rely on to read at all on a phone.",
  "heading-order":
    "Screen-reader users navigate by heading level to skim a page; a skipped or out-of-order level makes the structure misleading and hides where sections begin.",
  "heading-one":
    "Without a top-level heading, screen-reader users have no reliable landmark for “what this page is about” and can't jump to the main content by heading.",
  landmark:
    "Landmark regions let screen-reader users jump straight to navigation, main content or the footer; content outside them can only be reached by reading everything in order.",
  list: "Screen readers announce “list, N items” and let users skip it; broken list markup loses that count and the ability to move item by item.",
  aria: "Incorrect or incomplete ARIA makes assistive technology announce the wrong role or state, which is often worse than no ARIA at all.",
  "duplicate-id":
    "Duplicate ids break the links between labels, controls and ARIA references, so the wrong element gets announced or activated.",
  frame: "Screen-reader users hear an unlabeled frame with no idea what it contains, so they may skip important embedded content.",
  "focus-visible":
    "Sighted keyboard users lose track of where they are on the page when the focus indicator disappears, and can't tell which control they're about to activate.",
  "focus-order":
    "When Tab order doesn't follow the visual order, keyboard and screen-reader users are thrown around the page and can miss or repeat content.",
  "keyboard-trap":
    "Keyboard users get stuck: focus enters a widget and can't leave, so the rest of the page becomes unreachable without a mouse.",
  tabindex:
    "A positive tabindex overrides the natural order, so keyboard focus jumps unpredictably and skips past nearby controls.",
  reachable:
    "These controls can't be reached with the keyboard at all, so anyone who doesn't use a mouse can't operate them.",
  "target-size":
    "Small touch targets are hard to hit for people with motor or dexterity limitations, and for anyone on a moving bus or with large fingers.",
  motion:
    "Users who set “reduce motion” (often because animation triggers nausea or vertigo) still get movement they asked the system to suppress.",
  live: "Screen-reader users miss updates like errors, confirmations and counts, because the region that should announce them isn't set up to.",
  generic:
    "Assistive-technology users hit a barrier here that sighted mouse users don't, so the same task is harder or impossible for them.",
};

const GUIDANCE: Partial<Record<Category, Guidance>> = {
  "heading-one": {
    action:
      "Add one <h1> that describes the page's main purpose, at the start of the primary content, before the introductory text.",
    example: {
      lang: "html",
      code: "<main>\n  <h1>User Interface Challenge</h1>\n  …\n</main>",
    },
    caution:
      "Don't add an empty or visually hidden heading only to silence the rule unless that truly matches the page structure.",
  },
  "heading-order": {
    action:
      "Change the flagged heading so levels only ever increase by one (h2 to h3, never h2 to h4). Renumber for structure, not for visual size, and use CSS to size it.",
    caution: "Never skip a level to get a smaller font; style the correct level instead.",
  },
  landmark: {
    action:
      "Wrap the primary content in a <main> landmark. Keep site-wide navigation in <nav>, introductory branding in <header> and closing information in <footer>, so every part of the page sits inside a landmark.",
    example: {
      lang: "html",
      code: "<header>…</header>\n<nav>…</nav>\n<main>…</main>\n<footer>…</footer>",
    },
  },
  list: {
    action:
      "Make sure every <li> is a direct child of a <ul> or <ol> (and nothing but <li> sits directly inside them). Don't fake lists with <div>s and bullets.",
    example: { lang: "html", code: "<ul>\n  <li>…</li>\n  <li>…</li>\n</ul>" },
  },
  "duplicate-id": {
    action:
      "Give the flagged element a unique id. If several controls share one label, point each label/aria reference at its own id instead of reusing one.",
  },
  frame: {
    action: "Add a short, descriptive title attribute to the <iframe> saying what it contains.",
    example: { lang: "html", code: '<iframe title="Location map" src="…"></iframe>' },
  },
  "focus-visible": {
    action:
      "Give interactive elements a clearly visible focus style. Style :focus-visible rather than removing outlines. Never set outline: none without a replacement.",
    example: {
      lang: "css",
      code: ":focus-visible {\n  outline: 2px solid #17181a;\n  outline-offset: 2px;\n}",
    },
    caution: "Don't rely on color change alone; keep a visible outline or box-shadow.",
  },
  "focus-order": {
    action:
      "Put the elements in the DOM in the order people should Tab through them, and remove positive tabindex values so focus follows the source order.",
    humanDecision: true,
  },
  "keyboard-trap": {
    action:
      "Make sure focus can leave the widget with Tab / Shift+Tab (and Esc for dialogs). Manage focus in JS so it returns to a sensible place when the widget closes.",
    humanDecision: true,
  },
  tabindex: {
    action:
      "Remove tabindex values greater than 0. Use tabindex=\"0\" to make a custom control focusable, or -1 to focus it from code. Never use positive numbers.",
  },
  reachable: {
    action:
      "Make each control a real focusable element: use <button>/<a> instead of a clickable <div>, or add tabindex=\"0\" plus keyboard handlers to the custom control.",
    example: { lang: "html", code: "<button type=\"button\">Menu</button>" },
    humanDecision: true,
  },
  "target-size": {
    action:
      "Give the target at least 24×24px of hit area (44×44 is safer on touch), or leave enough spacing around it. Pad the control rather than only enlarging an icon.",
    example: { lang: "css", code: ".control {\n  min-block-size: 24px;\n  min-inline-size: 24px;\n}" },
  },
  motion: {
    action:
      "Wrap non-essential animation in a prefers-reduced-motion guard so it's suppressed for people who asked for less motion.",
    example: {
      lang: "css",
      code: "@media (prefers-reduced-motion: reduce) {\n  * { animation: none; transition: none; }\n}",
    },
  },
  live: {
    action:
      "Announce dynamic updates through a live region: put status text in an element with aria-live=\"polite\" (or role=\"status\"), and errors in aria-live=\"assertive\".",
    example: { lang: "html", code: '<p role="status" aria-live="polite">…</p>' },
  },
};

/** Concrete consequence for the "Impact on users" block. */
export function humanImpact(ruleId: string, kind?: string): string {
  return IMPACT[categoryOf(ruleId, kind)];
}

/** Actionable guidance for the "How to fix" block, when the engine text is generic. */
export function fixGuidance(ruleId: string, kind?: string): Guidance | null {
  return GUIDANCE[categoryOf(ruleId, kind)] ?? null;
}

/** Why the finding has no marker on the capture — mapped from its category/kind. */
export function markerReason(ruleId: string, kind: string, isDocLevel: boolean): string {
  if (kind === "best-practice") {
    return "Best practice, reported as coverage. It is not tied to one positioned element.";
  }
  if (kind === "context") {
    return "Found in a different context (mobile size or an opened state), so it is not on the desktop screenshot.";
  }
  if (kind === "keyboard") {
    return "From the keyboard pass, so it appears on the focus path rather than as an issue marker.";
  }
  if (isDocLevel) {
    return "Applies to the whole document or page structure, not a single positioned element.";
  }
  return "The affected element is outside the part of the page we captured (the first 1200×800 pixels), is hidden, or has no visible box on the screenshot.";
}

const DOC_LEVEL = new Set<Category>(["lang", "title", "zoom", "heading-one", "landmark"]);

export function isDocLevelCategory(ruleId: string, kind?: string): boolean {
  return DOC_LEVEL.has(categoryOf(ruleId, kind));
}
