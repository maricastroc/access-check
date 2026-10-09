import type { Metadata } from "next";
import { SiteHeader } from "@/components/home/site-header";
import { Button } from "@/components/ui";
import { getTranslate, resolveLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslate();
  return { title: t("notFound.metaTitle") };
}

export default async function NotFound() {
  const locale = await resolveLocale();
  const t = await getTranslate();

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <SiteHeader locale={locale} />
      <main id="main" className="mx-auto w-full max-w-300 flex-1 px-6 pt-20 pb-24">
        <p className="font-mono text-[13px] text-muted">404</p>
        <h1 className="mt-2 text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] text-ink">
          {t("notFound.title")}
        </h1>
        <p className="mt-3 max-w-[52ch] text-[16px] leading-normal text-body">
          {t("notFound.body")}
        </p>
        <Button href="/" variant="primary" size="md" className="mt-8">
          {t("notFound.home")}
        </Button>
      </main>
    </div>
  );
}
