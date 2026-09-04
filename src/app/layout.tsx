import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "AccessCheck: measure, locate and trace every accessibility barrier",
  description:
    "Paste a web address. AccessCheck opens the page in a real browser, runs axe-core (WCAG levels A and AA) plus keyboard, mobile and vision passes, and returns each finding tied to the element that caused it, with a fix tested on a copy of the page.",
  icons: {
    icon: "/app-icon-512.png",
    apple: "/app-icon-512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-surface"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
