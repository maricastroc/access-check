"use client";

import { useEffect, useState } from "react";
import type { ScanResult } from "@/lib/scan/types";
import { fixDomId, type FilterKey } from "./shared";
import { ScoreCard } from "./score-card";
import { StatTiles } from "./stat-tiles";
import { FixFirst } from "./fix-first";
import { ViolationsList } from "./violations-list";

export function ReportPanel({
  result,
  filter,
  setFilter,
}: {
  result: ScanResult;
  filter: FilterKey;
  setFilter: (f: FilterKey) => void;
}) {
  // Coordena o "View fix" do Fix First com a lista de violações: abre o
  // <details> certo e rola até ele depois que o filtro volta pra "all".
  const [focusFix, setFocusFix] = useState<string | null>(null);

  useEffect(() => {
    if (!focusFix) return;

    const t = setTimeout(() => {
      const el = document.getElementById(fixDomId(focusFix));
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setFocusFix(null);
    }, 60);
    return () => clearTimeout(t);
  }, [focusFix]);

  const openFix = (title: string) => {
    setFilter("all");
    setFocusFix(title);
  };

  return (
    <section className="flex flex-col gap-3.5">
      <ScoreCard result={result} />
      <StatTiles result={result} />
      <FixFirst items={result.fixFirst} onViewFix={openFix} />
      <ViolationsList result={result} filter={filter} setFilter={setFilter} />
    </section>
  );
}
