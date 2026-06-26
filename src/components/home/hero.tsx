import { Badge } from "@/components/ui";
import { HeroReportCard } from "./hero-report-card";
import { UrlForm } from "./url-form";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Fundo nativo de a11y: grade pontilhada (estrutura/inspeção) + glow */}
      <div aria-hidden className="ac-grid absolute inset-0 z-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-0 z-0 h-144 w-xl rounded-full bg-brand-100/40 blur-3xl"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-10 lg:px-10">
        {/* Coluna esquerda */}
        <div className="relative">
          <Badge tone="brand" dot>
            WCAG 2.1 · A, AA &amp; AAA coverage
          </Badge>

          <h1 className="mt-6 text-5xl leading-[1.04] font-bold tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]">
            Audit any website for <span className="text-brand-600">accessibility</span> in seconds.
          </h1>

          <p className="mt-6 max-w-md text-lg leading-7 text-muted">
            Paste a URL. AccessCheck runs a full WCAG 2.1 audit, simulates real visual impairments,
            and hands you an exportable report you can act on.
          </p>

          <UrlForm />

          <div className="mt-8 flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-success" />
              No login required
            </span>
            <span className="h-4 w-px bg-line" />
            <span>Full report in ~10 seconds</span>
          </div>
        </div>

        {/* Coluna direita — mockup do relatório */}
        <div className="relative lg:pl-6">
          <HeroReportCard />
        </div>
      </div>
    </section>
  );
}
