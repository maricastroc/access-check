import type { Severity } from "@/lib/scan/types";

export type SimKey =
  | "normal"
  | "deuteranopia"
  | "protanopia"
  | "tritanopia"
  | "lowvision"
  | "grayscale";

export const modeList: { key: SimKey; label: string }[] = [
  { key: "normal", label: "Normal" },
  { key: "deuteranopia", label: "Deuteranopia" },
  { key: "protanopia", label: "Protanopia" },
  { key: "tritanopia", label: "Tritanopia" },
  { key: "lowvision", label: "Low Vision" },
  { key: "grayscale", label: "Grayscale" },
];

export const previewFilters: Record<SimKey, string> = {
  normal: "none",
  deuteranopia: "url(#cb-deut)",
  protanopia: "url(#cb-prot)",
  tritanopia: "url(#cb-trit)",
  lowvision: "blur(1.2px) contrast(0.82) brightness(1.04)",
  grayscale: "grayscale(1)",
};

export const modeDesc: Record<SimKey, string> = {
  normal: "Default rendering, with no vision filter.",
  deuteranopia: "Red-green color blindness, missing green cones. Affects about 6% of men.",
  protanopia: "Red-green color blindness, missing red cones. Affects about 2% of men.",
  tritanopia: "Blue-yellow color blindness, missing blue cones. Rare, about 0.01%.",
  lowvision: "Reduced sharpness and contrast sensitivity.",
  grayscale: "All color removed. Checks that meaning survives without hue.",
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
