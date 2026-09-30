"use client";

import { useTransition } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import { ConfirmDialog } from "@/components/ui";
import { clearHistory, deleteScan } from "./actions";
import { useT } from "@/lib/i18n/provider";

export function DeleteScanButton({ id }: { id: string }) {
  const t = useT();
  const [pending, start] = useTransition();

  return (
    <ConfirmDialog
      title={t("history.deleteOneTitle")}
      description={t("history.deleteOneBody")}
      confirmLabel="Delete audit"
      onConfirm={() => start(() => deleteScan(id))}
      trigger={
        <button
          type="button"
          disabled={pending}
          aria-label={t("history.deleteOne")}
          className="absolute top-2.5 left-2.5 z-10 flex size-8 cursor-pointer items-center justify-center border border-hairline bg-surface/90 text-muted opacity-0 backdrop-blur transition-all group-hover:opacity-100 hover:text-critical disabled:opacity-100"
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
  const t = useT();
  const [pending, start] = useTransition();

  return (
    <ConfirmDialog
      title={t("history.deleteAllTitle")}
      description={t("history.deleteAllBody")}
      confirmLabel={t("history.deleteAll")}
      onConfirm={() => start(() => clearHistory())}
      trigger={
        <button
          type="button"
          disabled={pending}
          className="flex h-9 cursor-pointer items-center gap-2 border border-hairline bg-surface px-3.5 text-sm font-medium text-body transition-colors hover:border-critical/40 hover:text-critical disabled:opacity-50"
        >
          <FontAwesomeIcon
            icon={pending ? faSpinner : faTrash}
            className={`text-xs ${pending ? "animate-spin" : ""}`}
          />
          {t("history.clearHistory")}
        </button>
      }
    />
  );
}
