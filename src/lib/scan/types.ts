export type Severity = "critical" | "serious" | "moderate" | "minor";

/**
 * Resultado da validação de um fix: aplicamos a mutação sugerida no DOM e
 * re-rodamos o axe escopado na regra pra confirmar que a violação some.
 *  - "verified": a regra deixou de falhar naquele elemento → conserto provado
 *  - "failed":   o axe ainda acusa → a sugestão não basta sozinha
 *  - "unchecked": fix sem mutação auto-aplicável (ex.: remoção de ARIA)
 */
export type FixVerification = "verified" | "failed" | "unchecked";

/**
 * Um conserto que se aplica a vários elementos da mesma violação. Vários nós
 * que compartilham exatamente o mesmo fix (ex.: 14 botões com o mesmo contraste)
 * viram um grupo só, com seletores combinados e a contagem de quantos cobre.
 */
export type FixGroup = {
  /** explicação em prosa, compartilhada pelos nós do grupo */
  text: string;
  /** trecho copiável (CSS/HTML), quando há */
  code?: string;
  /** quantos elementos este conserto resolve de uma vez */
  count: number;
  /** seletores cobertos (limitado pra não estourar o payload) */
  selectors: string[];
  /** resultado de re-rodar o axe após aplicar o fix */
  verification: FixVerification;
};

export type ScanViolation = {
  id: string;
  severity: Severity;
  title: string;
  criterion: string;
  where: string;
  desc: string;
  fix: string;
  /** trecho de código copiável (CSS/HTML), quando há fix determinístico */
  fixCode?: string;
  nodes: number;
  /**
   * Consertos agrupados por assinatura. Quando presente, a UI mostra
   * "este fix resolve N elementos" em vez de repetir o mesmo chip por nó.
   */
  fixGroups?: FixGroup[];
  /** validação do fix principal (o do primeiro nó), quando aplicável */
  verification?: FixVerification;
};

export type ScanMarker = {
  n: number;
  severity: Severity;
  label: string;
  /** posição em % relativa ao screenshot (0–100) */
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Item que o axe não conseguiu determinar automaticamente — requer revisão humana. */
export type ScanIncomplete = {
  id: string;
  title: string;
  desc: string;
  nodes: number;
  criterion: string;
  /** Primeiros seletores dos elementos afetados (máx. 5) */
  selectors: string[];
};

/** Violação de best-practice (não WCAG) — melhoria recomendada, não bloqueante. */
export type ScanBestPractice = {
  id: string;
  title: string;
  desc: string;
  nodes: number;
  /** Primeiros seletores dos elementos afetados (máx. 5) */
  selectors: string[];
};

export type ScanResult = {
  url: string;
  finalUrl: string;
  title: string;
  scannedElements: number;
  durationMs: number;
  /** screenshot acima da dobra, como data URL */
  screenshot: string | null;
  score: number;
  counts: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    passed: number;
    bestPractice: number;
    manualReview: number;
  };
  summary: string;
  violations: ScanViolation[];
  /** Itens que o axe sinalizou como inconclusivos — precisam de revisão manual. */
  incomplete: ScanIncomplete[];
  /** Recomendações de best-practice — não são violações WCAG. */
  bestPractice: ScanBestPractice[];
  passed: string[];
  markers: ScanMarker[];
  fixFirst: {
    n: string;
    title: string;
    effort: string;
    impact: "High" | "Medium" | "Low";
  }[];
};

export type ScanError = { error: string };
