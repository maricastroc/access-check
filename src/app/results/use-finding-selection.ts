"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FindingView } from "@/lib/report/findings";

export type FindingSelection = {
  selectedId: string | null;
  selectedFinding: FindingView | null;
  selectFinding: (id: string) => void;
  selectMarker: (markerN: number) => void;
};

export function useFindingSelection(findings: FindingView[]): FindingSelection {
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const selectFinding = useCallback((id: string) => setSelectedId(id), []);

  const selectMarker = useCallback(
    (markerN: number) => {
      const ownerId = markerOwner.get(markerN);
      if (ownerId) setSelectedId(ownerId);
    },
    [markerOwner],
  );

  useEffect(() => {
    if (!selectedId) return;
    const id = window.setTimeout(() => {
      document.getElementById(`finding-${selectedId}`)?.scrollIntoView({ block: "center" });
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

  return { selectedId, selectedFinding, selectFinding, selectMarker };
}
