import type { WcagReadingModel } from "@/lib/report/wcag";
import { SectionKicker, WcagReading } from "@/components/ui";
import { UrlForm } from "./url-form";
import { HeroEvidencePreview } from "./evidence-preview";
import { DemoSummary } from "./demo";
import type { Translate } from "@/lib/i18n/t";

export function Hero({ t }: { t: Translate }) {
  const wcag: WcagReadingModel = {
    a: { fails: false, criteria: [] },
    aa: { fails: true, criteria: [{ sc: "1.4.3", name: t("wcag.1.4.3") }] },
    aaa: { evaluated: false },
  };

  return (
    <section className="border-b border-hairline bg-canvas">
      <div className="mx-auto w-full max-w-300 px-6">
        <div className="grid grid-cols-1 gap-x-14 gap-y-10 pt-14 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-start lg:gap-x-20">
          <div>
            <div>
              <SectionKicker tone="steel">{t("home.hero.standards")}</SectionKicker>
              <p className="mt-1 text-[13px] text-muted">{t("home.hero.passes")}</p>
            </div>
            <h1 className="mt-5 font-sans text-[42px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink">
              {t("home.hero.title")}
            </h1>
            <p className="mt-4 max-w-[52ch] text-[17px] leading-normal text-body">
              {t("home.hero.body")}
            </p>
            <div className="mt-6">
              <UrlForm examples={["news.ycombinator.com", "lrb.co.uk", "kinfolk.com"]} />
            </div>
          </div>

          <div className="lg:pt-1">
            <HeroEvidencePreview t={t} />
            <p className="mt-2.5 text-[12.5px] text-muted">{t("home.hero.lensNote")}</p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-12 border border-hairline bg-surface p-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <SectionKicker variant="section" tone="steel">
              {t("home.mostRecent")}
            </SectionKicker>
            <div className="mt-4">
              <DemoSummary />
            </div>
          </div>
          <WcagReading t={t} model={wcag} />
        </div>

        <div className="pb-12" />
      </div>
    </section>
  );
}
