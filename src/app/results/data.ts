import type { Severity } from "@/lib/scan/types";
import type { MessageKey } from "@/lib/i18n/t";

export type SimKey =
  | "normal"
  | "deuteranopia"
  | "protanopia"
  | "tritanopia"
  | "lowvision"
  | "grayscale";

export const modeList: { key: SimKey; label: MessageKey }[] = [
  { key: "normal", label: "vision.normal" },
  { key: "deuteranopia", label: "vision.deuteranopia" },
  { key: "protanopia", label: "vision.protanopia" },
  { key: "tritanopia", label: "vision.tritanopia" },
  { key: "lowvision", label: "vision.lowVision" },
  { key: "grayscale", label: "vision.grayscale" },
];

export const previewFilters: Record<SimKey, string> = {
  normal: "none",
  deuteranopia: "url(#cb-deut)",
  protanopia: "url(#cb-prot)",
  tritanopia: "url(#cb-trit)",
  lowvision: "blur(1.2px) contrast(0.82) brightness(1.04)",
  grayscale: "grayscale(1)",
};

export const modeDesc: Record<SimKey, MessageKey> = {
  normal: "sim.normalDesc",
  deuteranopia: "sim.deuteranopiaDesc",
  protanopia: "sim.protanopiaDesc",
  tritanopia: "sim.tritanopiaDesc",
  lowvision: "sim.lowVisionDesc",
  grayscale: "sim.grayscaleDesc",
};

export const sevDot: Record<Severity, string> = {
  critical: "bg-critical",
  serious: "bg-serious",
  moderate: "bg-moderate",
  minor: "bg-faint",
};

export const sevText: Record<Severity, string> = {
  critical: "text-critical",
  serious: "text-serious",
  moderate: "text-moderate",
  minor: "text-faint",
};

export const severityLabel: Record<Severity, string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
};

export const severityOrder: Severity[] = ["critical", "serious", "moderate", "minor"];
