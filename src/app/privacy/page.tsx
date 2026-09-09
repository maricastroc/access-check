import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/home/site-header";
import { getTranslate, resolveLocale } from "@/lib/i18n/server";
import type { ReportLocale } from "@/lib/i18n/locale";

export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslate();
  return { title: t("privacy.metaTitle"), description: t("privacy.metaDescription") };
}

const SOURCE: Record<ReportLocale, string> = {
  en: join(process.cwd(), "extension/PRIVACY.md"),
  "pt-BR": join(process.cwd(), "extension/PRIVACY.pt-BR.md"),
};

type Block = { kind: "h1" | "h2" | "p"; text: string } | { kind: "ul"; items: string[] };

function parse(markdown: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of markdown.split(/\n{2,}/)) {
    const text = chunk.trim();
    if (!text) continue;
    if (text.startsWith("## ")) blocks.push({ kind: "h2", text: text.slice(3) });
    else if (text.startsWith("# ")) blocks.push({ kind: "h1", text: text.slice(2) });
    else if (text.startsWith("- ")) {
      blocks.push({
        kind: "ul",
        items: text
          .split(/\n(?=- )/)
          .map((line) => line.replace(/^- /, "").replace(/\n\s+/g, " ").trim()),
      });
    } else blocks.push({ kind: "p", text: text.replace(/\n\s*/g, " ") });
  }
  return blocks;
}

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part.replace(/\\/g, "")}</span>
        ),
      )}
    </>
  );
}

export default async function PrivacyPage() {
  const locale = await resolveLocale();
  const blocks = parse(readFileSync(SOURCE[locale], "utf8"));

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-ink">
      <SiteHeader locale={locale} />
      <main className="mx-auto w-full max-w-2xl px-5 py-10">
        {blocks.map((block, i) => {
          if (block.kind === "h1") {
            return (
              <h1 key={i} className="font-cond text-[32px] leading-tight font-semibold text-ink">
                {block.text}
              </h1>
            );
          }
          if (block.kind === "h2") {
            return (
              <h2 key={i} className="mt-8 text-[19px] font-semibold text-ink">
                {block.text}
              </h2>
            );
          }
          if (block.kind === "ul") {
            return (
              <ul
                key={i}
                className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-body"
              >
                {block.items.map((item) => (
                  <li key={item}>
                    <Rich text={item} />
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="mt-3 text-[15px] leading-relaxed text-body">
              <Rich text={block.text} />
            </p>
          );
        })}
      </main>
    </div>
  );
}
