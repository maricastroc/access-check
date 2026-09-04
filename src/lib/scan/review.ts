export type ReviewGuidance = {
  how: string;
  steps: string[];
};

const GENERIC: ReviewGuidance = {
  how: "Automated testing couldn't decide this one, so it needs a person to confirm.",
  steps: [
    "Inspect each affected element in your browser's developer tools",
    "Check it against the WCAG success criterion listed here",
    "Confirm the intent holds for screen-reader and keyboard users",
  ],
};

const GUIDANCE: Record<string, ReviewGuidance> = {
  "color-contrast": {
    how: "The checker couldn't read what's behind this text. It's usually a background image, a gradient, a see-through layer, or an element sitting on top.",
    steps: [
      "Look at the text over its real, rendered background",
      "Sample the text and background colors with a color picker",
      "Confirm at least 4.5:1 (3:1 for large text, meaning 24px or larger, or 18.66px bold or larger)",
    ],
  },
  "link-in-text-block": {
    how: "Links inside a block of text must be tellable apart without relying on color alone.",
    steps: [
      "Give the link a cue that isn't color, such as an underline (the safest option)",
      "If it's color-only, confirm at least 3:1 contrast against the surrounding text",
      "Confirm a visible change on hover and on keyboard focus",
    ],
  },
  "scrollable-region-focusable": {
    how: "This region scrolls, so keyboard users must be able to reach and scroll it.",
    steps: [
      "Tab to the region and try scrolling with the arrow keys",
      'If it isn\'t reachable, add tabindex="0" to the scroll container',
      "Make sure the content inside is still reachable in a sensible order",
    ],
  },
  "label-content-name-mismatch": {
    how: "The visible label and the accessible name differ, which breaks voice-control users who say what they see.",
    steps: [
      "Compare the visible text with the aria-label / aria-labelledby",
      "Ensure the accessible name contains the visible text, in the same order",
      "Prefer dropping the aria-label and letting the visible text be the name",
    ],
  },
  "frame-title": {
    how: "This page embeds an <iframe> axe can't see into.",
    steps: [
      "Give the <iframe> a short, descriptive title attribute",
      "Audit the framed page separately. It has its own accessibility",
    ],
  },
  "th-has-data-cells": {
    how: "axe couldn't confirm this table header is tied to its data cells.",
    steps: [
      "Confirm it's a real data table, not a layout table",
      "Give each header a scope (col/row), or link cells with headers/id",
    ],
  },
  "autocomplete-valid": {
    how: "The autocomplete value couldn't be validated automatically.",
    steps: [
      "Check the field's purpose matches a valid autocomplete token",
      "Use standard tokens (name, email, tel, etc.) so browsers can autofill",
    ],
  },
  "css-orientation-lock": {
    how: "The page may lock content to a single screen orientation.",
    steps: [
      "Rotate the device or emulator between portrait and landscape",
      "Confirm content and functionality survive both orientations",
    ],
  },
  "p-as-heading": {
    how: "A paragraph is styled to look like a heading (bold or large).",
    steps: [
      "If it introduces a section, make it a real <h1>–<h6>",
      "If it's just emphasized text, this one is safe to dismiss",
    ],
  },
  "nested-interactive": {
    how: "An interactive control looks nested inside another (e.g. a button inside a link).",
    steps: [
      "Confirm there aren't focusable controls inside other controls",
      "Flatten the markup so each control stands on its own",
    ],
  },
};

export function reviewGuidance(id: string): ReviewGuidance {
  return GUIDANCE[id] ?? GENERIC;
}
