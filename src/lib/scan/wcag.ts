import type { MessageKey, Translate } from "../i18n/t";
const scNames: Record<string, MessageKey> = {
  "1.1.1": "wcag.1.1.1",
  "1.3.1": "wcag.1.3.1",
  "1.3.5": "wcag.1.3.5",
  "1.4.1": "wcag.1.4.1",
  "1.4.3": "wcag.1.4.3",
  "1.4.4": "wcag.1.4.4",
  "1.4.10": "wcag.1.4.10",
  "1.4.11": "wcag.1.4.11",
  "2.1.1": "wcag.2.1.1",
  "2.4.1": "wcag.2.4.1",
  "2.4.2": "wcag.2.4.2",
  "2.4.4": "wcag.2.4.4",
  "2.4.7": "wcag.2.4.7",
  "2.5.8": "wcag.2.5.8",
  "3.1.1": "wcag.3.1.1",
  "3.3.2": "wcag.3.3.2",
  "4.1.2": "wcag.4.1.2",
};

export function criterionFromTags(tags: string[], t: Translate): string | null {
  const tag = tags.find((t) => /^wcag\d{3,4}$/.test(t));
  if (!tag) return null;

  const digits = tag.replace("wcag", "");
  const major = digits[0];
  const minor = digits[1];
  const sub = digits.slice(2);
  const sc = `${major}.${minor}.${sub}`;
  const key = scNames[sc];
  return key ? `WCAG ${sc} · ${t(key)}` : `WCAG ${sc}`;
}
