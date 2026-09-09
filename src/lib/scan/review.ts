import type { MessageKey, Translate } from "../i18n/t";

export type ReviewGuidance = {
  how: string;
  steps: string[];
};

type ReviewSpec = { how: MessageKey; steps: MessageKey[] };

const GENERIC: ReviewSpec = {
  how: "review.generic.how",
  steps: ["review.generic.s1", "review.generic.s2", "review.generic.s3"],
};

const GUIDANCE: Record<string, ReviewSpec> = {
  "color-contrast": {
    how: "review.contrast.how",
    steps: ["review.contrast.s1", "review.contrast.s2", "review.contrast.s3"],
  },
  "link-in-text-block": {
    how: "review.linkInText.how",
    steps: ["review.linkInText.s1", "review.linkInText.s2", "review.linkInText.s3"],
  },
  "scrollable-region-focusable": {
    how: "review.scrollable.how",
    steps: ["review.scrollable.s1", "review.scrollable.s2", "review.scrollable.s3"],
  },
  "label-content-name-mismatch": {
    how: "review.nameMismatch.how",
    steps: ["review.nameMismatch.s1", "review.nameMismatch.s2", "review.nameMismatch.s3"],
  },
  "frame-title": {
    how: "review.frame.how",
    steps: ["review.frame.s1", "review.frame.s2"],
  },
  "th-has-data-cells": {
    how: "review.tableHeader.how",
    steps: ["review.tableHeader.s1", "review.tableHeader.s2"],
  },
  "autocomplete-valid": {
    how: "review.autocomplete.how",
    steps: ["review.autocomplete.s1", "review.autocomplete.s2"],
  },
  "css-orientation-lock": {
    how: "review.orientation.how",
    steps: ["review.orientation.s1", "review.orientation.s2"],
  },
  "p-as-heading": {
    how: "review.pAsHeading.how",
    steps: ["review.pAsHeading.s1", "review.pAsHeading.s2"],
  },
  "nested-interactive": {
    how: "review.nested.how",
    steps: ["review.nested.s1", "review.nested.s2"],
  },
};

export function reviewGuidance(id: string, t: Translate): ReviewGuidance {
  const spec = GUIDANCE[id] ?? GENERIC;
  return { how: t(spec.how), steps: spec.steps.map((step) => t(step)) };
}
