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
