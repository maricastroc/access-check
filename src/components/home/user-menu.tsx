"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faChevronDown,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

type UserData = { name?: string | null; email?: string | null; image?: string | null };

export function UserMenu({
  user,
  signOutAction,
}: {
  user: UserData;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const firstName = user.name?.trim().split(/\s+/)[0] ?? user.email ?? "Account";

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-2.5 rounded-full border border-line bg-card py-2 pr-4 pl-1.5 text-sm font-medium text-ink shadow-soft transition-all hover:bg-canvas hover:shadow-card"
      >
        <Avatar user={user} />
        <span className="hidden sm:block">{firstName}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-[10px] text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-card shadow-card"
        >
          <div className="border-b border-line px-4 py-3">
            <div className="truncate text-sm font-semibold text-ink">{user.name ?? "Account"}</div>
            {user.email && <div className="truncate text-xs text-muted">{user.email}</div>}
          </div>

          <div className="p-1.5">
            <Link
              href="/history"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
            >
              <FontAwesomeIcon icon={faClockRotateLeft} className="w-4 text-muted" />
              History
            </Link>

            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
              >
                <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-4 text-muted" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ user }: { user: UserData }) {
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt=""
        className="size-8 rounded-full border border-line object-cover"
      />
    );
  }
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
      {initial}
    </span>
  );
}
