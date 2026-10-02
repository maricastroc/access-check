"use client";

import type { ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm duration-200" />
        <AlertDialog.Content className="data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 border border-hairline bg-surface p-6 shadow-selected duration-200 focus:outline-none">
          <AlertDialog.Title className="text-lg font-bold tracking-tight text-ink">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted">
            {description}
          </AlertDialog.Description>

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="flex h-9 cursor-pointer items-center border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-canvas"
              >
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={onConfirm}
                className={`flex h-9 cursor-pointer items-center px-4 text-sm font-semibold text-white transition-colors ${
                  destructive
                    ? "bg-critical hover:bg-[color-mix(in_srgb,var(--color-critical)_85%,var(--color-ink))]"
                    : "bg-ink hover:bg-ink-2"
                }`}
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
