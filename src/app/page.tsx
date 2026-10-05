import { SiteHeader } from "@/components/home/site-header";
import { getTranslate, resolveLocale } from "@/lib/i18n/server";
import { Hero } from "@/components/home/hero";
import {
  ChecksIncluded,
  EvidenceLensSection,
  ExportSection,
  FinalCta,
  HowItWorks,
  SandboxSection,
} from "@/components/home/landing-sections";

export default async function Home() {
  const t = await getTranslate();
  const locale = await resolveLocale();

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <SiteHeader locale={locale} />
      <main id="main" className="flex-1">
        <Hero t={t} />
        <HowItWorks t={t} />
        <ChecksIncluded t={t} />
        <EvidenceLensSection t={t} />
        <SandboxSection t={t} />
        <ExportSection t={t} />
        <FinalCta t={t} />
      </main>
    </div>
  );
}
