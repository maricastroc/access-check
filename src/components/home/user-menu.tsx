"use client";

import { useTransition } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faChevronDown,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

type UserData = { name?: string | null; email?: string | null; image?: string | null };

const itemClasses =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft outline-none transition-colors hover:bg-canvas hover:text-ink data-[highlighted]:bg-canvas data-[highlighted]:text-ink";

export function UserMenu({
  user,
  signOutAction,
}: {
  user: UserData;
  signOutAction: () => Promise<void>;
}) {
  const [, startTransition] = useTransition();
  const firstName = user.name?.trim().split(/\s+/)[0] ?? user.email ?? "Account";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="group flex cursor-pointer items-center gap-2.5 rounded-full border border-line bg-card py-2 pr-4 pl-1.5 text-sm font-medium text-ink shadow-soft transition-all outline-none hover:bg-canvas hover:shadow-card"
        >
          <Avatar user={user} />
          <span className="hidden sm:block">{firstName}</span>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="text-[10px] text-muted transition-transform group-data-[state=open]:rotate-180"
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-56 overflow-hidden rounded-xl border border-line bg-card shadow-card duration-150 data-[side=bottom]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="border-b border-line px-4 py-3">
            <div className="truncate text-sm font-semibold text-ink">{user.name ?? "Account"}</div>
            {user.email && <div className="truncate text-xs text-muted">{user.email}</div>}
          </div>

          <div className="p-1.5">
            <DropdownMenu.Item asChild>
              <Link href="/history" className={itemClasses}>
                <FontAwesomeIcon icon={faClockRotateLeft} className="w-4 text-muted" />
                History
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onSelect={() => startTransition(() => signOutAction())}
              className={itemClasses}
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-4 text-muted" />
              Sign out
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
