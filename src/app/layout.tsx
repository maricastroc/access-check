import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { resolveLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { translator } from "@/lib/i18n/t";

config.autoAddCss = false;

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = translator(await resolveLocale());

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    icons: {
      icon: "/app-icon-512.png",
      apple: "/app-icon-512.png",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await resolveLocale();
  const t = translator(locale);

  return (
    <html
      lang={locale}
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-surface"
        >
          {t("nav.skipToContent")}
        </a>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
