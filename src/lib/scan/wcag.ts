// Nomes amigáveis dos critérios de sucesso WCAG mais comuns (axe só devolve a tag).
const scNames: Record<string, string> = {
  "1.1.1": "Non-text Content",
  "1.3.1": "Info and Relationships",
  "1.3.5": "Identify Input Purpose",
  "1.4.1": "Use of Color",
  "1.4.3": "Contrast (Minimum)",
  "1.4.4": "Resize Text",
  "1.4.10": "Reflow",
  "1.4.11": "Non-text Contrast",
  "2.1.1": "Keyboard",
  "2.4.1": "Bypass Blocks",
  "2.4.2": "Page Titled",
  "2.4.4": "Link Purpose (In Context)",
  "2.4.7": "Focus Visible",
  "2.5.8": "Target Size (Minimum)",
  "3.1.1": "Language of Page",
  "3.3.2": "Labels or Instructions",
  "4.1.2": "Name, Role, Value",
};

/**
 * Converte as tags do axe (ex. "wcag143") no rótulo "WCAG 1.4.3 · Contrast (Minimum)".
 * Retorna null se nenhuma tag de critério for encontrada.
 */
export function criterionFromTags(tags: string[]): string | null {
  const tag = tags.find((t) => /^wcag\d{3,4}$/.test(t));
  if (!tag) return null;

  const digits = tag.replace("wcag", "");
  // 143 -> 1.4.3 ; 1410 -> 1.4.10
  const major = digits[0];
  const minor = digits[1];
  const sub = digits.slice(2);
  const sc = `${major}.${minor}.${sub}`;
  const name = scNames[sc];
  return name ? `WCAG ${sc} · ${name}` : `WCAG ${sc}`;
}
