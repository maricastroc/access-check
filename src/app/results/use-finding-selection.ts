"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FindingView } from "@/lib/report/findings";
import { scrollBehavior } from "@/lib/motion";

export type FindingSelection = {
  selectedId: string | null;
  selectedFinding: FindingView | null;
  pick: number;
  selectFinding: (id: string) => void;
  toggleFinding: (id: string) => void;
  selectMarker: (markerN: number) => void;
};

export function useFindingSelection(findings: FindingView[]): FindingSelection {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pick, setPick] = useState(0);

  const [prevFindings, setPrevFindings] = useState(findings);
  if (findings !== prevFindings) {
    setPrevFindings(findings);
    setSelectedId(null);
  }

  const markerOwner = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of findings) for (const m of f.markers) map.set(m.n, f.id);
    return map;
  }, [findings]);

  const selectedFinding = useMemo(
    () => findings.find((f) => f.id === selectedId) ?? null,
    [findings, selectedId],
  );

  const selectFinding = useCallback((id: string) => {
    setSelectedId(id);
    setPick((n) => n + 1);
  }, []);

  const toggleFinding = useCallback((id: string) => {
    setSelectedId((current) => (current === id ? null : id));
    setPick((n) => n + 1);
  }, []);

  const selectMarker = useCallback(
    (markerN: number) => {
      const ownerId = markerOwner.get(markerN);
      if (!ownerId) return;
      setSelectedId(ownerId);
      setPick((n) => n + 1);
    },
    [markerOwner],
  );

  useEffect(() => {
    if (!selectedId) return;
    const id = window.setTimeout(() => {
      document
        .getElementById(`finding-${selectedId}`)
        ?.scrollIntoView({ block: "center", behavior: scrollBehavior() });
    }, 20);
    return () => window.clearTimeout(id);
  }, [selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { selectedId, selectedFinding, pick, selectFinding, toggleFinding, selectMarker };
}
