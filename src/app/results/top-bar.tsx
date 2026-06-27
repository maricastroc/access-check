"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRotateRight } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "@/components/ui";
import { UserMenu } from "@/components/home/user-menu";
import type { Status } from "./shared";

type HeaderUser = { name?: string | null; email?: string | null; image?: string | null };

export function TopBar({
  status,
  onRerun,
  busy,
  user,
  signOutAction,
}: {
  status: Status;
  onRerun: () => void;
  busy: boolean;
  user: HeaderUser | null;
  signOutAction: () => Promise<void>;
}) {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
      <Logo />

      <div className="flex items-center gap-3.5">
        <Link
          href="/"
          className="flex h-8.5 items-center gap-2 rounded-[9px] px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#f6f7f9] hover:text-ink"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          New scan
        </Link>
        <span className="h-5 w-px bg-line-strong" />
        <div className="flex items-center gap-1.75 text-[12.5px] text-ink-soft">
          <span
            className={`size-1.75 rounded-full ${
              status === "done"
                ? "bg-success shadow-[0_0_0_3px_rgba(31,157,107,.14)]"
                : status === "error"
                  ? "bg-critical"
                  : "animate-pulse bg-serious"
            }`}
          />
          {status === "done"
            ? "Analysis complete"
            : status === "error"
              ? "Analysis failed"
              : "Analyzing…"}
        </div>
        <button
          onClick={onRerun}
          disabled={busy}
          className="flex h-8.5 cursor-pointer items-center gap-2 rounded-[9px] border border-line-strong bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-[#f6f7f9] disabled:opacity-50"
        >
          <FontAwesomeIcon
            icon={faArrowRotateRight}
            className={`text-xs ${busy ? "animate-spin" : ""}`}
          />
          Re-run analysis
        </button>

        <span className="h-5 w-px bg-line-strong" />

        {user ? (
          <UserMenu user={user} signOutAction={signOutAction} />
        ) : (
          <Link
            href="/login"
            className="flex h-8.5 items-center rounded-[9px] px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#f6f7f9] hover:text-ink"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
