"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { SectionKicker } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/provider";
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
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-full cursor-pointer items-center border px-2.5 text-left text-[13px] font-medium transition-colors disabled:cursor-default",
        active
          ? "border-ink bg-ink text-surface"
          : "border-border bg-surface text-ink hover:bg-band",
        disabled && "text-disabled hover:bg-surface",
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
  const t = useT();

  return (
    <div className="flex flex-col gap-1.5 border-r border-border bg-band px-3 py-3">
      <SectionKicker className="mb-0.5">{t("vision.rail")}</SectionKicker>
      {VISION_RAIL.map((m) => (
        <RailButton
          key={m.key}
          active={sim === m.key}
          title={t(m.title)}
          onClick={() => setSim(m.key)}
        >
          {t(m.label)}
        </RailButton>
      ))}

      <span aria-hidden className="my-1.5 h-px w-full bg-border" />

      <SectionKicker className="mb-0.5">{t("layer.rail")}</SectionKicker>
      {LAYER_RAIL.map((l) => (
        <RailButton
          key={l.key}
          active={layer === l.key}
          disabled={layerDisabled && l.key !== "none"}
          title={t(l.title)}
          onClick={() => setLayer(l.key)}
        >
          {t(l.label)}
        </RailButton>
      ))}

      <span aria-hidden className="my-1.5 h-px w-full bg-border" />

      <RailButton
        active={false}
        title={collapsed ? t("capture.show") : t("capture.collapse")}
        onClick={onToggleCollapse}
      >
        <span className="flex items-center gap-2">
          <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} className="text-xs" />
          {collapsed ? t("capture.show") : t("capture.collapseShort")}
        </span>
      </RailButton>
    </div>
  );
}
