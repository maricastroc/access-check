import {
  faCircleCheck,
  faCircleHalfStroke,
  faEye,
  faHeading,
  faImage,
  faLink,
  faTag,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { ConformanceLevel, StatusTone } from "@/components/ui";

export const conformanceLevels: ConformanceLevel[] = [
  { id: "A", value: 100, passed: true },
  { id: "AA", value: 100, passed: true },
  { id: "AAA", value: 94, passed: false },
];

export type ReportRow = {
  label: string;
  status: string;
  tone: StatusTone;
};

export const reportRows: ReportRow[] = [
  { label: "Color contrast", status: "2 to fix", tone: "warning" },
  { label: "Alt text", status: "Passed", tone: "success" },
  { label: "Form labels", status: "1 to fix", tone: "warning" },
  { label: "Heading hierarchy", status: "Passed", tone: "success" },
];

export type Feature = {
  icon: IconDefinition;
  title: string;
  body: string;
};

export const features: Feature[] = [
  {
    icon: faCircleCheck,
    title: "WCAG 2.1 validation",
    body: "Automated checks against A, AA and AAA success criteria.",
  },
  {
    icon: faCircleHalfStroke,
    title: "Color contrast",
    body: "Foreground and background ratios flagged against thresholds.",
  },
  {
    icon: faImage,
    title: "Missing alt text",
    body: "Every image checked for meaningful alternative text.",
  },
  {
    icon: faTag,
    title: "Form labels",
    body: "Inputs verified for associated, descriptive labels.",
  },
  {
    icon: faHeading,
    title: "Heading hierarchy",
    body: "Document outline validated for logical structure.",
  },
  {
    icon: faLink,
    title: "Link accessibility",
    body: "Ambiguous and unlabeled links surfaced for review.",
  },
  {
    icon: faEye,
    title: "Vision simulation",
    body: "Preview your page through color blindness and low vision.",
  },
];
