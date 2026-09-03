import { cn } from "@/lib/cn";

export type CodeTone = "default" | "selector" | "added" | "removed" | "muted";

export type CodeLine = { text: string; tone?: CodeTone };

const toneClass: Record<CodeTone, string> = {
  default: "text-[#2b2b2d]",
  selector: "text-steel",
  added: "text-verified",
  removed: "text-muted line-through",
  muted: "text-muted",
};

/**
 * A flat technical block: ivory `code` ground, hairline border, mono 12.5/1.7.
 * `truncate` renders a single ellipsized line (mobile). Selectors read in steel,
 * an added line in verified — the only place either color touches code.
 */
export function CodeBlock({
  lines,
  truncate = false,
  className,
}: {
  lines: CodeLine[];
  truncate?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-hairline bg-code px-3 py-2.5 font-mono text-[12.5px] leading-[1.7]",
        truncate && "overflow-hidden",
        className,
      )}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            toneClass[line.tone ?? "default"],
            truncate && "overflow-hidden text-ellipsis whitespace-nowrap",
          )}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}
