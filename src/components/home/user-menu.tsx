"use client";

import { useTransition } from "react";
import { useT } from "@/lib/i18n/provider";
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
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-body outline-none transition-colors hover:bg-band hover:text-ink data-[highlighted]:bg-band data-[highlighted]:text-ink";

export function UserMenu({
  user,
  signOutAction,
}: {
  user: UserData;
  signOutAction: () => Promise<void>;
}) {
  const t = useT();
  const [, startTransition] = useTransition();
  const firstName = user.name?.trim().split(/\s+/)[0] ?? user.email ?? t("nav.account");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="group flex cursor-pointer items-center gap-2.5 rounded-full border border-hairline bg-surface py-2 pr-4 pl-1.5 text-sm font-medium text-ink transition-all outline-none hover:bg-canvas"
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
          className="z-50 w-56 overflow-hidden rounded-xl border border-hairline bg-surface shadow-selected"
        >
          <div className="border-b border-hairline px-4 py-3">
            <div className="truncate text-sm font-semibold text-ink">
              {user.name ?? t("nav.account")}
            </div>
            {user.email && <div className="truncate text-xs text-muted">{user.email}</div>}
          </div>

          <div className="p-1.5">
            <DropdownMenu.Item asChild>
              <Link href="/history" className={itemClasses}>
                <FontAwesomeIcon icon={faClockRotateLeft} className="w-4 text-muted" />
                {t("nav.history")}
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onSelect={() => startTransition(() => signOutAction())}
              className={itemClasses}
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-4 text-muted" />
              {t("nav.signOut")}
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
        className="size-8 rounded-full border border-hairline object-cover"
      />
    );
  }
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-band text-xs font-bold text-steel">
      {initial}
    </span>
  );
}
