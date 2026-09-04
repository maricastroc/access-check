"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { SectionKicker } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { SimKey } from "./data";
import { LAYER_RAIL, VISION_RAIL, type Layer } from "./report-ui";

function RailButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-10 w-11 items-center justify-center border font-cond text-[13px] font-medium transition-colors",
        active
          ? "border-ink bg-ink text-surface"
          : "border-border bg-surface text-ink hover:bg-band",
        disabled && "cursor-default text-disabled hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}

export function VisionRail({
  sim,
  setSim,
  layer,
  setLayer,
  layerDisabled,
  collapsed,
  onToggleCollapse,
}: {
  sim: SimKey;
  setSim: (s: SimKey) => void;
  layer: Layer;
  setLayer: (l: Layer) => void;
  layerDisabled: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 border-r border-border bg-band py-3">
      <SectionKicker className="mb-0.5">Vision</SectionKicker>
      {VISION_RAIL.map((m) => (
        <RailButton
          key={m.key}
          active={sim === m.key}
          title={m.title}
          onClick={() => setSim(m.key)}
        >
          {m.short}
        </RailButton>
      ))}

      <span aria-hidden className="my-1 h-px w-8 bg-border" />

      <SectionKicker className="mb-0.5">Layer</SectionKicker>
      {LAYER_RAIL.map((l) => (
        <RailButton
          key={l.key}
          active={layer === l.key}
          disabled={layerDisabled && l.key !== "none"}
          title={l.title}
          onClick={() => setLayer(l.key)}
        >
          {l.short}
        </RailButton>
      ))}

      <span aria-hidden className="my-1 h-px w-8 bg-border" />

      <RailButton
        active={false}
        title={collapsed ? "Show screenshot" : "Collapse screenshot"}
        onClick={onToggleCollapse}
      >
        <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} className="text-xs" />
      </RailButton>
    </div>
  );
}
