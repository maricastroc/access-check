import Link from "next/link";
import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "@/components/ui";

export function CrawlShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-5 sm:px-6 sm:py-6">
        <Logo meta="Site audit" />
        <Link
          href="/"
          className="flex h-8.5 items-center gap-2 rounded-[9px] px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#f6f7f9] hover:text-ink"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          <span className="hidden sm:inline">New scan</span>
        </Link>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        {children}
      </main>
    </div>
  );
}
