import { Logo } from "@/components/ui";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { translator, type MessageKey } from "@/lib/i18n/t";
import type { ReportLocale } from "@/lib/i18n/locale";

const NAV: { href: string; label: MessageKey }[] = [
  { href: "/#how", label: "nav.howItWorks" },
  { href: "/#checks", label: "nav.checks" },
  { href: "/#evidence", label: "nav.evidenceLens" },
];

export function SiteHeader({ locale }: { locale: ReportLocale }) {
  const t = translator(locale);

  return (
    <header className="border-b border-hairline bg-canvas">
      <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-[14.5px] text-body hover:text-ink">
              {t(n.label)}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <LanguageSwitcher locale={locale} />
        </div>
      </div>
    </header>
  );
}
