export type ElementIdentity = {
  tag: string;
  ref: string | null;
  name: string | null;
  region: string | null;
  regionName: string | null;
  nth: number | null;
  of: number | null;
};

const NAME_MAX = 40;

const ORDINAL_SCAN_CAP = 120;

const HASHED = /(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z0-9]{5,}/i;

const GENERATED_ID = /:|\d{6,}|^[0-9a-f]{8,}$/;

const TEST_ATTRS = ["data-testid", "data-test-id", "data-test", "data-cy", "data-qa"];

const LABELABLE = ["input", "select", "textarea", "meter", "progress", "output"];

const OPAQUE_CLASS = /^(css|sc|jsx|svelte|emotion)-|^[a-z]{1,3}[A-Z][A-Za-z0-9]{4,}$|\d{4,}/;

const STRONG_LANDMARKS = ["header", "nav", "main", "aside", "footer", "form", "search", "dialog"];

const TITLED_BY_HEADING = ["section", "article"];

const LANDMARK_TAGS = [...STRONG_LANDMARKS, ...TITLED_BY_HEADING];

const LANDMARK_SELECTOR = [
  ...LANDMARK_TAGS,
  '[role="banner"]',
  '[role="navigation"]',
  '[role="main"]',
  '[role="complementary"]',
  '[role="contentinfo"]',
  '[role="search"]',
  '[role="form"]',
  '[role="region"]',
  '[role="dialog"]',
].join(",");

function squash(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function clamp(value: string): string {
  return value.length > NAME_MAX ? `${value.slice(0, NAME_MAX).trimEnd()}…` : value;
}

function labelText(el: Element): string {
  if (!LABELABLE.includes(el.tagName.toLowerCase())) return "";

  const id = el.getAttribute("id");
  const target = id ? document.querySelector(`label[for="${id.replace(/["\\]/g, "\\$&")}"]`) : null;
  return squash((target ?? el.closest("label"))?.textContent);
}

export function accessibleName(el: Element): string {
  if (el === document.documentElement || el === document.body) return "";

  const aria = squash(el.getAttribute("aria-label"));
  if (aria) return clamp(aria);

  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const target = document.getElementById(labelledby.split(/\s+/)[0]);
    const referenced = squash(target?.textContent);
    if (referenced) return clamp(referenced);
  }

  const labelled = labelText(el);
  if (labelled) return clamp(labelled);

  const text = el.querySelector("script,style") ? "" : squash(el.textContent);
  if (text) return clamp(text);

  for (const attr of ["alt", "title", "placeholder"]) {
    const value = squash(el.getAttribute(attr));
    if (value) return clamp(value);
  }

  const value = squash((el as HTMLInputElement).value);
  if (value) return clamp(value);

  const inner = el.querySelector("[alt],[title],[aria-label]");
  if (inner) {
    const described = squash(
      inner.getAttribute("aria-label") ?? inner.getAttribute("alt") ?? inner.getAttribute("title"),
    );
    if (described) return clamp(described);
  }

  return "";
}

function usableId(el: Element): string | null {
  const id = el.getAttribute("id");
  if (!id || id.length > 40 || GENERATED_ID.test(id)) return null;
  return id.split(/[-_]/).some((part) => HASHED.test(part)) ? null : id;
}

function attrRef(attr: string, raw: string): string | null {
  const value = squash(raw);
  if (!value || value.includes('"')) return null;
  if (value.length <= NAME_MAX) return `[${attr}="${value}"]`;
  return `[${attr}^="${value.slice(0, NAME_MAX)}"]`;
}

function lastPathSegment(raw: string): string | null {
  const path = raw.trim().split(/[?#]/)[0].replace(/\/+$/, "");
  if (!path || path.length > 40) return null;
  const segment = path.split("/").filter(Boolean).pop();
  return segment && segment.length <= 32 ? segment : null;
}

function usableClass(el: Element): string | null {
  const list = Array.from(el.classList);
  if (list.length === 0 || list.length > 3) return null;
  const found = list.find(
    (c) =>
      c.length <= 24 &&
      /^[a-z][a-z0-9_-]*$/i.test(c) &&
      !OPAQUE_CLASS.test(c) &&
      !HASHED.test(c.split(/[-_]/).pop() ?? ""),
  );
  return found ?? null;
}

function refOf(el: Element): string | null {
  const id = usableId(el);
  if (id) return `#${id}`;

  for (const attr of TEST_ATTRS) {
    const ref = attrRef(attr, el.getAttribute(attr) ?? "");
    if (ref) return ref;
  }

  const name = attrRef("name", el.getAttribute("name") ?? "");
  if (name) return name;

  for (const attr of ["src", "href"]) {
    const raw = el.getAttribute(attr);
    if (raw === null) continue;
    const segment = lastPathSegment(raw);
    if (segment && !segment.includes('"')) return `[${attr}*="${segment}"]`;
  }

  if (el.tagName === "INPUT") {
    const type = attrRef("type", el.getAttribute("type") ?? "");
    if (type) return type;
  }

  const className = usableClass(el);
  return className ? `.${className}` : null;
}

function namedBy(el: Element): string | null {
  const aria = squash(el.getAttribute("aria-label"));
  if (aria) return clamp(aria);

  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const target = document.getElementById(labelledby.split(/\s+/)[0]);
    const referenced = squash(target?.textContent);
    if (referenced) return clamp(referenced);
  }

  const role = squash(el.getAttribute("role"));
  const titled =
    TITLED_BY_HEADING.includes(el.tagName.toLowerCase()) || role === "region" || role === "dialog";
  if (!titled) return null;

  const heading = el.querySelector("h1,h2,h3,h4,h5,h6");
  const text = squash(heading?.textContent);
  return text ? clamp(text) : null;
}

function landmarkToken(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (LANDMARK_TAGS.includes(tag)) return `<${tag}>`;
  const role = squash(el.getAttribute("role"));
  return role ? `[role="${role}"]` : `<${tag}>`;
}

function enclosingRegion(el: Element): Element | null {
  const found: Element[] = [];
  let node = el.parentElement;
  while (node && found.length < 4) {
    if (node.matches(LANDMARK_SELECTOR)) found.push(node);
    node = node.parentElement;
  }
  if (found.length === 0) return null;

  return (
    found.find((candidate) => namedBy(candidate) !== null) ??
    found.find((candidate) => STRONG_LANDMARKS.includes(candidate.tagName.toLowerCase())) ??
    found[0]
  );
}

function enclosingId(el: Element): string | null {
  let node = el.parentElement;
  while (node) {
    const id = usableId(node);
    if (id) return `#${id}`;
    node = node.parentElement;
  }
  return null;
}

function matchKey(el: Element): string {
  return `${refOf(el) ?? ""}|${accessibleName(el)}`;
}

function siblingsOf(scope: ParentNode, tag: string, ref: string | null): Element[] {
  if (ref) {
    try {
      return Array.from(scope.querySelectorAll(`${tag}${ref}`));
    } catch {
      return [];
    }
  }
  const all = scope.querySelectorAll(tag);
  return all.length > ORDINAL_SCAN_CAP ? [] : Array.from(all);
}

function ordinalIn(el: Element, scope: ParentNode, tag: string, ref: string | null) {
  const candidates = siblingsOf(scope, tag, ref);
  if (candidates.length < 2) return null;

  const key = matchKey(el);
  const same = candidates.filter((candidate) => matchKey(candidate) === key);
  const index = same.indexOf(el);
  if (same.length < 2 || index < 0) return null;

  return { nth: index + 1, of: same.length };
}

export function identityOf(el: Element): ElementIdentity {
  const tag = el.tagName.toLowerCase();
  const region = enclosingRegion(el);
  const ref = refOf(el);
  const ordinal = ordinalIn(el, region ?? document, tag, ref);

  return {
    tag,
    ref,
    name: accessibleName(el) || null,
    region: region ? landmarkToken(region) : enclosingId(el),
    regionName: region ? namedBy(region) : null,
    nth: ordinal?.nth ?? null,
    of: ordinal?.of ?? null,
  };
}

export function collectIdentities(selectors: string[]): Record<string, ElementIdentity> {
  const out: Record<string, ElementIdentity> = {};
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) out[selector] = identityOf(el);
    } catch {
      continue;
    }
  }
  return out;
}
