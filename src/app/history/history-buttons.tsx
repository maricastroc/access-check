"use client";

import { useTransition } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import { ConfirmDialog } from "@/components/ui";
import { clearHistory, deleteScan } from "./actions";

export function DeleteScanButton({ id }: { id: string }) {
  const [pending, start] = useTransition();

  return (
    <ConfirmDialog
      title="Delete this audit?"
      description="This removes the saved report and its screenshot from your history. This can’t be undone."
      confirmLabel="Delete audit"
      onConfirm={() => start(() => deleteScan(id))}
      trigger={
        <button
          type="button"
          disabled={pending}
          aria-label="Delete this audit"
          className="border-line bg-card/90 shadow-soft absolute top-2.5 left-2.5 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full border text-muted opacity-0 backdrop-blur transition-all group-hover:opacity-100 hover:text-critical disabled:opacity-100"
        >
          <FontAwesomeIcon
            icon={pending ? faSpinner : faTrash}
            className={`text-xs ${pending ? "animate-spin" : ""}`}
          />
        </button>
      }
    />
  );
}

export function ClearHistoryButton() {
  const [pending, start] = useTransition();

  return (
    <ConfirmDialog
      title="Clear your audit history?"
      description="This permanently deletes every saved audit and screenshot. This can’t be undone."
      confirmLabel="Delete all audits"
      onConfirm={() => start(() => clearHistory())}
      trigger={
        <button
          type="button"
          disabled={pending}
          className="border-line bg-card text-ink-soft shadow-soft flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border px-3.5 text-sm font-medium transition-colors hover:border-critical/40 hover:text-critical disabled:opacity-50"
        >
          <FontAwesomeIcon
            icon={pending ? faSpinner : faTrash}
            className={`text-xs ${pending ? "animate-spin" : ""}`}
          />
          Clear history
        </button>
      }
    />
  );
}
