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
      title="Delete this scan?"
      description="This removes the saved report and its screenshot from your history. This can’t be undone."
      confirmLabel="Delete"
      onConfirm={() => start(() => deleteScan(id))}
      trigger={
        <button
          type="button"
          disabled={pending}
          aria-label="Delete scan"
          className="absolute top-2.5 left-2.5 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full border border-line bg-card/90 text-muted opacity-0 shadow-soft backdrop-blur transition-all group-hover:opacity-100 hover:text-critical disabled:opacity-100"
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
      title="Clear your scan history?"
      description="This permanently deletes every saved scan and screenshot. This can’t be undone."
      confirmLabel="Delete all"
      onConfirm={() => start(() => clearHistory())}
      trigger={
        <button
          type="button"
          disabled={pending}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-line bg-card px-3.5 text-sm font-medium text-ink-soft shadow-soft transition-colors hover:border-critical/40 hover:text-critical disabled:opacity-50"
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
