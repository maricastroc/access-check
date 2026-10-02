import type { CSSProperties, ReactNode } from "react";
import type { FindingView } from "@/lib/report/findings";
import type { ThreadEnd } from "@/lib/report/chain";
import { ratioPosition } from "@/lib/report/contrast";
import { cn } from "@/lib/cn";

export type Sev = "critical" | "serious" | "moderate" | "minor" | "review" | "none";

export type Box = { left: number; top: number; width: number; height: number };

export function sevOf(f: Pick<FindingView, "kind" | "evidence" | "severity">): Sev {
  if (f.kind === "manual-review" || f.evidence === "heuristic") return "review";
  return f.severity ?? "none";
}

const ON_PAGE = "0 0 0 1.5px var(--color-halo), 0 0 0 2.5px rgba(18,18,17,.42)";
const RING = "0 0 0 2px var(--color-canvas), 0 0 0 4px var(--color-ink)";

export function Tag({
  n,
  sev,
  shape = "square",
  size = 22,
  onPage = false,
  selected = false,
  quiet = false,
  children,
  className,
}: {
  n: ReactNode;
  sev: Sev;
  shape?: "square" | "circle";
  size?: number;
  onPage?: boolean;
  selected?: boolean;
  quiet?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const filled = !quiet && ["critical", "serious", "moderate"].includes(sev);
  const circle = shape === "circle";
  const shadows = [onPage ? ON_PAGE : null, selected ? RING : null].filter(Boolean).join(", ");

  const style: CSSProperties = {
    height: size,
    minWidth: size,
    fontSize: size <= 18 ? 11.5 : size >= 26 ? 14 : 12.5,
    boxShadow: shadows || undefined,
  };

  return (
    <span
      aria-hidden
      data-sev={sev}
      style={style}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 font-mono leading-none font-semibold whitespace-nowrap tabular-nums select-none",
        circle
          ? quiet
            ? "rounded-full border-[1.5px] border-path bg-surface px-1 text-path"
            : "rounded-full bg-path px-1 text-white"
          : "px-[5px]",
        !circle && filled && "bg-(--sev) text-white",
        !circle && quiet && "border border-ink-2 bg-surface text-ink-2",
        !circle &&
          !quiet &&
          sev === "review" &&
          "border-[1.5px] border-dashed border-review bg-surface text-review",
        !circle &&
          !quiet &&
          (sev === "none" || sev === "minor") &&
          "border-[1.5px] border-ink-2 bg-surface text-ink",
        className,
      )}
    >
      <span>{n}</span>
      {children}
    </span>
  );
}

export function Corners({
  arm = "min(10px, 40%)",
  bar = 2,
  ink = "var(--color-ink)",
  className,
  style,
}: {
  arm?: string;
  bar?: number;
  ink?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={cn("ac-corners pointer-events-none absolute", className)}
      style={{
        ["--arm" as string]: arm,
        ["--bar" as string]: `${bar}px`,
        ["--ink" as string]: ink,
        ...style,
      }}
    />
  );
}

const LOCUS = {
  current: { inset: 5, arm: "min(13px, 42%)", bar: 2.5, opacity: 1, halo: 3 },
  sibling: { inset: 4, arm: "min(8px, 40%)", bar: 1.5, opacity: 0.8, halo: 2 },
} as const;

export function Locus({
  box,
  weight,
  anchor,
  extra = 0,
  className,
}: {
  box: Box;
  weight: keyof typeof LOCUS;
  anchor?: string;
  extra?: number;
  className?: string;
}) {
  const cfg = LOCUS[weight];
  const inset = cfg.inset + extra;
  return (
    <span
      aria-hidden
      data-anchor={anchor}
      className={cn("pointer-events-none absolute", className)}
      style={{
        left: `${box.left}%`,
        top: `${box.top}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
        opacity: cfg.opacity,
      }}
    >
      <Corners
        arm={`calc(${cfg.arm} + ${cfg.halo}px)`}
        bar={cfg.bar + cfg.halo}
        ink="var(--color-halo)"
        style={{ inset: -(inset + cfg.halo / 2) }}
      />
      <Corners arm={cfg.arm} bar={cfg.bar} style={{ inset: -inset }} />
    </span>
  );
}

export function GhostRing({ box, gap = 4 }: { box: Box; gap?: number }) {
  return (
    <span
      aria-hidden
      data-sev="serious"
      className="pointer-events-none absolute"
      style={{
        left: `${box.left}%`,
        top: `${box.top}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
      }}
    >
      <span
        className="ac-hatch-on-page absolute"
        style={{
          inset: -gap,
          padding: gap,
          WebkitMask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
        }}
      />
      <span
        className="absolute border-[1.5px] border-dashed border-(--sev)"
        style={{ inset: -gap, outline: "1px solid var(--color-halo)" }}
      />
    </span>
  );
}

function EndGlyph({ end, cx, cy, r }: { end: ThreadEnd; cx: number; cy: number; r: number }) {
  if (end === "tested") {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="var(--color-verified)" />
        <path
          d={`M${cx - r * 0.48} ${cy + r * 0.02} l${r * 0.34} ${r * 0.36} l${r * 0.66} -${r * 0.74}`}
          fill="none"
          stroke="white"
          strokeWidth={Math.max(1.4, r * 0.28)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }
  if (end === "failed") {
    const d = r * 0.4;
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="white"
          stroke="var(--color-critical)"
          strokeWidth="1.5"
        />
        <path
          d={`M${cx - d} ${cy - d} L${cx + d} ${cy + d} M${cx + d} ${cy - d} L${cx - d} ${cy + d}`}
          stroke="var(--color-critical)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    );
  }
  if (end === "person") {
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="white"
          stroke="var(--color-review)"
          strokeWidth="1.5"
          strokeDasharray="2.2 1.6"
        />
        <circle cx={cx} cy={cy} r={r * 0.32} fill="var(--color-review)" />
      </g>
    );
  }
  return (
    <circle cx={cx} cy={cy} r={r} fill="white" stroke="var(--color-ink-2)" strokeWidth="1.5" />
  );
}

export function NodeGlyph({
  kind,
  sev,
  end,
}: {
  kind: "located" | "evidence" | "change" | "end";
  sev: Sev;
  end?: ThreadEnd | null;
}) {
  if (kind === "located") {
    return (
      <span aria-hidden className="relative block size-4 bg-surface">
        <Corners arm="6px" bar={2} style={{ inset: 0 }} />
      </span>
    );
  }
  if (kind === "evidence") {
    const unmeasured = sev === "review" || sev === "none" || sev === "minor";
    return (
      <span
        aria-hidden
        data-sev={sev}
        className={cn(
          "block size-4 border-[1.5px] border-(--sev) bg-surface",
          unmeasured ? "border-dashed" : "ac-hatch",
        )}
      />
    );
  }
  if (kind === "change") {
    return (
      <span aria-hidden className="flex size-4 items-center justify-center bg-surface">
        <span className="block size-[11px] rotate-45 border-[1.5px] border-ink bg-surface" />
      </span>
    );
  }
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 18 18"
      className="block rounded-full bg-surface"
    >
      <EndGlyph end={end ?? "untested"} cx={9} cy={9} r={7.5} />
    </svg>
  );
}

export function RatioGauge({
  measured,
  required,
  sev,
  neededLabel,
}: {
  measured: number;
  required: number;
  sev: Sev;
  neededLabel: string;
}) {
  const at = (r: number) => ratioPosition(r);
  const req = at(required);
  const from = at(measured);

  return (
    <div data-sev={sev} className="relative h-[58px]" aria-hidden>
      <span className="absolute inset-x-0 top-[32px] h-px bg-ink-2" />
      {[1, 2, 3, 4, 5, 6, 7].map((v) => (
        <span
          key={v}
          className="absolute top-[28px] h-[5px] w-px bg-rule"
          style={{ left: `${at(v)}%` }}
        />
      ))}
      <span
        className="ac-hatch absolute top-[20px] h-[12px]"
        style={{ left: `${from}%`, width: `${Math.max(0, req - from)}%` }}
      />
      <span
        className="absolute top-[14px] h-[26px] w-0.5 -translate-x-1/2 bg-ink"
        style={{ left: `${req}%` }}
      />
      <span
        className="absolute top-[40px] -translate-x-1/2 font-mono text-[12.5px] leading-[18px] font-semibold whitespace-nowrap text-ink"
        style={{ left: `${req}%` }}
      >
        {required} {neededLabel}
      </span>
      <span
        className="absolute top-[12px] h-[21px] w-0.5 -translate-x-1/2 bg-(--sev)"
        style={{ left: `${from}%` }}
      />
      <span
        className="absolute top-0 font-mono text-[13px] leading-[14px] font-semibold whitespace-nowrap text-(--sev)"
        style={{ right: `calc(${100 - from}% + 5px)` }}
      >
        {measured.toFixed(2)}
      </span>
    </div>
  );
}

export function NameSlot({ sev }: { sev: Sev }) {
  return (
    <span
      aria-hidden
      data-sev={sev}
      className="ac-hatch inline-block h-[1.05em] w-[7ch] border-[1.5px] border-(--sev) align-[-0.18em]"
    />
  );
}

export function Heard({
  role,
  name,
  sev,
  label,
  missing,
}: {
  role: string;
  name: string | null;
  sev: Sev;
  label: string;
  missing: string;
}) {
  return (
    <div>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 font-mono text-[16px] leading-7 break-words text-ink">
        “
        {name ? (
          <span className="font-semibold text-verified">{name}</span>
        ) : (
          <>
            <NameSlot sev={sev} />
            <span className="sr-only">{missing}</span>
          </>
        )}
        ”, {role}
      </p>
    </div>
  );
}

export function Swatch({ hex }: { hex: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-3 shrink-0 border border-rule"
      style={{ background: hex }}
    />
  );
}

export function TextSample({
  fg,
  bg,
  text,
  caption,
  ratio,
  tone,
  showRatio = true,
}: {
  fg: string;
  bg: string;
  text: string;
  caption: string;
  ratio: number;
  tone: "measured" | "tested";
  showRatio?: boolean;
}) {
  return (
    <figure className="min-w-0">
      <svg
        role="img"
        aria-label={`${text}. ${fg} / ${bg}, ${ratio.toFixed(2)}:1`}
        className="block h-11 w-full outline -outline-offset-1 outline-hairline"
        style={{ background: bg }}
      >
        <text x="14" y="27" fill={fg} fontSize="15" fontFamily="var(--font-sans)">
          {text}
        </text>
      </svg>
      <figcaption className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
        <span className="font-semibold text-ink-2">{caption}</span>
        {showRatio && (
          <span
            className={cn(
              "font-mono font-semibold",
              tone === "tested" ? "text-verified" : "text-serious",
            )}
          >
            {ratio.toFixed(2)}:1
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 font-mono">
          <Swatch hex={fg} />
          {fg}
          <span aria-hidden>/</span>
          <Swatch hex={bg} />
          {bg}
        </span>
      </figcaption>
    </figure>
  );
}

export function CodeChange({ removed, added }: { removed?: string | null; added: string }) {
  return (
    <div className="overflow-x-auto bg-canvas py-1 font-mono text-[13.5px] leading-6">
      {removed && (
        <div className="flex gap-2 px-3 text-ink-2">
          <span aria-hidden className="text-critical">
            −
          </span>
          <del className="break-all decoration-critical">{removed}</del>
        </div>
      )}
      {added.split("\n").map((line, i) => (
        <div key={i} className="flex gap-2 bg-verified/[0.07] px-3 text-ink">
          <span aria-hidden className="text-verified">
            +
          </span>
          <ins className="break-all whitespace-pre-wrap no-underline">{line}</ins>
        </div>
      ))}
    </div>
  );
}

export function EndMark({ end, sev }: { end: ThreadEnd; sev: Sev }) {
  return <NodeGlyph kind="end" sev={sev} end={end} />;
}
