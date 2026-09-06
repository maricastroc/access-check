import type { ReactNode } from "react";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { Button, Logo } from "@/components/ui";

export function CrawlShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <header className="border-b border-hairline bg-canvas">
        <div className="mx-auto flex h-[68px] w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo meta="Site audit" />
          <Button
            href="/"
            variant="secondary"
            size="sm"
            icon={faArrowLeft}
            aria-label="Start a new audit"
            className="shrink-0"
          >
            <span className="hidden sm:inline">New audit</span>
          </Button>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 pb-16 sm:px-6">
        {children}
      </main>
    </div>
  );
}
