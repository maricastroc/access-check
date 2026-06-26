import { Card, IconBadge } from "@/components/ui";
import { features } from "./content";

export function Features() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pt-8 pb-28 lg:px-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-brand-600 uppercase">
            Every audit includes
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-ink">
            Seven checks, one paste.
          </h2>
        </div>
        <p className="max-w-xs text-sm leading-6 text-muted md:text-right">
          Each scan runs automatically — no configuration, no browser
          extensions, no code changes.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon, title, body }) => (
          <Card
            key={title}
            className="group relative p-6 transition-shadow hover:shadow-card"
          >
            {/* device de focus ring — revela no hover */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-1.5 rounded-[1.4rem] border-2 border-dashed border-brand-200 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
            <IconBadge icon={icon} />
            <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
