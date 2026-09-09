import type { MessageKey, Translate } from "../i18n/t";
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

const IMPACT_KEY: Record<Category, MessageKey> = {
  contrast: "impact.contrast",
  alt: "impact.alt",
  name: "impact.name",
  lang: "impact.lang",
  title: "impact.title",
  zoom: "impact.zoom",
  "heading-order": "impact.headingOrder",
  "heading-one": "impact.headingOne",
  landmark: "impact.landmark",
  list: "impact.list",
  aria: "impact.aria",
  "duplicate-id": "impact.duplicateId",
  frame: "impact.frame",
  "focus-visible": "impact.focusVisible",
  "focus-order": "impact.focusOrder",
  "keyboard-trap": "impact.keyboardTrap",
  tabindex: "impact.tabindex",
  reachable: "impact.reachable",
  "target-size": "impact.targetSize",
  motion: "impact.motion",
  live: "impact.live",
  generic: "impact.generic",
};

type GuidanceSpec = {
  action: MessageKey;
  example?: FixExample;
  caution?: MessageKey;
  humanDecision?: boolean;
};

const GUIDANCE: Partial<Record<Category, GuidanceSpec>> = {
  "heading-one": {
    action: "fix.headingOne.action",
    example: {
      lang: "html",
      code: "<main>\n  <h1>User Interface Challenge</h1>\n  \u2026\n</main>",
    },
    caution: "fix.headingOne.caution",
  },
  "heading-order": {
    action: "fix.headingOrder.action",
    caution: "fix.headingOrder.caution",
  },
  landmark: {
    action: "fix.landmark.action",
    example: {
      lang: "html",
      code: "<header>\u2026</header>\n<nav>\u2026</nav>\n<main>\u2026</main>\n<footer>\u2026</footer>",
    },
  },
  list: {
    action: "fix.list.action",
    example: { lang: "html", code: "<ul>\n  <li>\u2026</li>\n  <li>\u2026</li>\n</ul>" },
  },
  "duplicate-id": { action: "fix.duplicateId.action" },
  frame: {
    action: "fix.frame.action",
    example: { lang: "html", code: '<iframe title="Location map" src="\u2026"></iframe>' },
  },
  "focus-visible": {
    action: "fix.focusVisible.action",
    example: {
      lang: "css",
      code: ":focus-visible {\n  outline: 2px solid #17181a;\n  outline-offset: 2px;\n}",
    },
    caution: "fix.focusVisible.caution",
  },
  "focus-order": { action: "fix.focusOrder.action", humanDecision: true },
  "keyboard-trap": { action: "fix.keyboardTrap.action", humanDecision: true },
  tabindex: { action: "fix.tabindex.action" },
  reachable: {
    action: "fix.reachable.action",
    example: { lang: "html", code: '<button type="button">Menu</button>' },
    humanDecision: true,
  },
  "target-size": {
    action: "fix.targetSize.action",
    example: {
      lang: "css",
      code: ".control {\n  min-block-size: 24px;\n  min-inline-size: 24px;\n}",
    },
  },
  motion: {
    action: "fix.motion.action",
    example: {
      lang: "css",
      code: "@media (prefers-reduced-motion: reduce) {\n  * { animation: none; transition: none; }\n}",
    },
  },
  live: {
    action: "fix.live.action",
    example: { lang: "html", code: '<p role="status" aria-live="polite">\u2026</p>' },
  },
};

export function humanImpact(ruleId: string, t: Translate, kind?: string): string {
  return t(IMPACT_KEY[categoryOf(ruleId, kind)]);
}

export function fixGuidance(ruleId: string, t: Translate, kind?: string): Guidance | null {
  const spec = GUIDANCE[categoryOf(ruleId, kind)];
  if (!spec) return null;
  return {
    action: t(spec.action),
    example: spec.example,
    caution: spec.caution ? t(spec.caution) : undefined,
    humanDecision: spec.humanDecision,
  };
}

export function markerReason(
  ruleId: string,
  kind: string,
  isDocLevel: boolean,
  t: Translate,
): string {
  if (kind === "best-practice") return t("marker.bestPractice");
  if (kind === "context") return t("marker.context");
  if (kind === "keyboard") return t("marker.keyboard");
  if (isDocLevel) return t("marker.docLevel");
  return t("marker.offCapture");
}

const DOC_LEVEL = new Set<Category>(["lang", "title", "zoom", "heading-one", "landmark"]);

export function isDocLevelCategory(ruleId: string, kind?: string): boolean {
  return DOC_LEVEL.has(categoryOf(ruleId, kind));
}
