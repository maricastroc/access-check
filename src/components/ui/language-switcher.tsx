"use client";

import { useTransition } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { setLocale } from "@/app/locale-actions";
import { REPORT_LOCALES, type ReportLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/provider";

const NATIVE_NAME: Record<ReportLocale, string> = {
  en: "English",
  "pt-BR": "Português",
};

const SHORT_NAME: Record<ReportLocale, string> = {
  en: "EN",
  "pt-BR": "PT",
};

export function LanguageSwitcher({ locale }: { locale: ReportLocale }) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t("language.label")}
          disabled={pending}
          className="flex cursor-pointer items-center gap-1.5 border border-transparent px-2 py-1.5 text-[13px] font-medium text-muted transition-colors outline-none hover:border-border hover:text-ink focus-visible:border-ink disabled:cursor-default"
        >
          <FontAwesomeIcon icon={faGlobe} className="text-[12px]" />
          {SHORT_NAME[locale]}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-40 border border-border bg-surface py-1 shadow-sm"
        >
          {REPORT_LOCALES.map((option) => (
            <DropdownMenu.Item
              key={option}
              lang={option}
              onSelect={() => startTransition(() => setLocale(option))}
              className="flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-[13px] text-body outline-none data-[highlighted]:bg-band data-[highlighted]:text-ink"
            >
              {NATIVE_NAME[option]}
              {option === locale && (
                <FontAwesomeIcon icon={faCheck} className="text-[11px] text-verified" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
