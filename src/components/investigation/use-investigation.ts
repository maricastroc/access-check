"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FindingView } from "@/lib/report/findings";
import { occurrencesOf, stepOccurrence, type Occurrence } from "@/lib/report/occurrences";
import { scrollBehavior } from "@/lib/motion";

export type Origin = "row" | "mark" | "index" | "stop" | "nav";

export type Investigation = {
  selectedId: string | null;
  selected: FindingView | null;
  occIndex: number;
  occurrences: Occurrence[];
  origin: Origin;
  select: (id: string, occ?: number, origin?: Origin) => void;
  toggle: (id: string) => void;
  pick: (index: number) => void;
  step: (delta: 1 | -1) => void;
  clear: () => void;
};

export function useInvestigation(findings: FindingView[]): Investigation {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [occIndex, setOccIndex] = useState(0);
  const [origin, setOrigin] = useState<Origin>("row");
  const [ask, setAsk] = useState(0);

  const [prevFindings, setPrevFindings] = useState(findings);
  if (findings !== prevFindings) {
    setPrevFindings(findings);
    if (selectedId !== null && !findings.some((f) => f.id === selectedId)) {
      setSelectedId(null);
      setOccIndex(0);
    }
  }

  const selected = useMemo(
    () => findings.find((f) => f.id === selectedId) ?? null,
    [findings, selectedId],
  );
  const occurrences = useMemo(() => (selected ? occurrencesOf(selected) : []), [selected]);
  const at = Math.min(occIndex, Math.max(occurrences.length - 1, 0));

  const select = useCallback((id: string, occ = 0, from: Origin = "row") => {
    setSelectedId(id);
    setOccIndex(occ);
    setOrigin(from);
    setAsk((n) => n + 1);
  }, []);

  const toggle = useCallback(
    (id: string) => {
      if (id === selectedId) {
        setSelectedId(null);
        return;
      }
      select(id, 0, "row");
    },
    [selectedId, select],
  );

  const pick = useCallback((index: number) => setOccIndex(index), []);

  const step = useCallback(
    (delta: 1 | -1) => setOccIndex((i) => stepOccurrence(i, occurrences.length, delta)),
    [occurrences.length],
  );

  const clear = useCallback(() => setSelectedId(null), []);

  useEffect(() => {
    if (!selectedId || origin === "row") return;
    const id = window.setTimeout(() => {
      const row = document.getElementById(`finding-${selectedId}`);
      if (!row) return;
      const box = row.getBoundingClientRect();
      if (box.top < 72 || box.top > window.innerHeight * 0.6) {
        row.scrollIntoView({ block: "start", behavior: scrollBehavior() });
      }
      if (origin === "mark" || origin === "nav") {
        row.querySelector<HTMLButtonElement>("h3 > button")?.focus({ preventScroll: true });
      }
    }, 20);
    return () => window.clearTimeout(id);
  }, [selectedId, origin, ask]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return {
    selectedId: selected ? selectedId : null,
    selected,
    occIndex: at,
    occurrences,
    origin,
    select,
    toggle,
    pick,
    step,
    clear,
  };
}
