"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRotateRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "@/components/ui";
import { UserMenu } from "@/components/home/user-menu";

type HeaderUser = { name?: string | null; email?: string | null; image?: string | null };

export function TopBar({
  onRerun,
  busy,
  siteId,
  rerunLabel = "Re-run analysis",
  user,
  signOutAction,
}: {
  onRerun: () => void;
  busy: boolean;
  siteId: string | null;
  rerunLabel?: string;
  user: HeaderUser | null;
  signOutAction: () => Promise<void>;
}) {
  const btn =
    "flex h-8.5 items-center gap-2 rounded-[9px] border border-line-strong bg-card px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#f6f7f9] hover:text-ink sm:px-3.5";

  const account = user ? (
    <UserMenu user={user} signOutAction={signOutAction} />
  ) : (
    <Link
      href="/login"
      className="flex h-8.5 items-center rounded-[9px] px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#f6f7f9] hover:text-ink"
    >
      Sign in
    </Link>
  );

  return (
    <header className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      {/* Mobile: duas linhas (logo+conta / ações). Desktop: tudo numa linha. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <Logo />
          <div className="sm:hidden">{account}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3.5">
          {siteId && (
            <Link
              href={`/site/${siteId}`}
              aria-label="Back to site audit"
              aria-disabled={busy}
              tabIndex={busy ? -1 : undefined}
              onClick={busy ? (e) => e.preventDefault() : undefined}
              className={`${btn} ${busy ? "pointer-events-none opacity-50" : ""}`}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
              Site audit
            </Link>
          )}
          <Link
            href="/"
            aria-label="New scan"
            aria-disabled={busy}
            tabIndex={busy ? -1 : undefined}
            onClick={busy ? (e) => e.preventDefault() : undefined}
            className={`${btn} ${busy ? "pointer-events-none opacity-50" : ""}`}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            New scan
          </Link>
          <button
            onClick={onRerun}
            disabled={busy}
            aria-label={rerunLabel}
            className={`${btn} cursor-pointer disabled:opacity-50`}
          >
            <FontAwesomeIcon
              icon={faArrowRotateRight}
              className={`text-xs ${busy ? "animate-spin" : ""}`}
            />
            {rerunLabel}
          </button>

          <span className="hidden h-5 w-px bg-line-strong sm:block" />
          <div className="hidden sm:block">{account}</div>
        </div>
      </div>
    </header>
  );
}
