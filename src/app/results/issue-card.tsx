import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

interface IssueCardProps {
  dot: string;
  title: string;
  subtitle: string;
  nodes: number;
  where?: string;
  anchorId?: string;
  children: React.ReactNode;
}

export function IssueCard({
  dot,
  title,
  subtitle,
  nodes,
  where,
  anchorId,
  children,
}: IssueCardProps) {
  const elemChip = nodes > 1 && (
    <span className="shrink-0 rounded-md bg-chip px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-muted">
      {nodes} elem.
    </span>
  );

  return (
    <details
      id={anchorId}
      className="mb-2 scroll-mt-24 rounded-xl border border-line bg-card transition-[border-color] hover:border-line-hover"
    >
      <summary className="flex cursor-pointer items-start gap-3 px-3.75 py-3.25">
        <span className={`mt-1.5 size-1.75 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium">{title}</div>
          <div className="mt-0.5 font-mono text-[11px] text-faint">{subtitle}</div>
          {(nodes > 1 || where) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:hidden">
              {elemChip}
              {where && (
                <span className="max-w-full truncate rounded-md bg-chip px-2 py-0.75 font-mono text-[11px] text-faint">
                  {where}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          {elemChip}
          {where && (
            <span className="max-w-35 truncate rounded-md bg-chip px-2 py-0.75 font-mono text-[11px] text-faint">
              {where}
            </span>
          )}
        </div>
        <FontAwesomeIcon
          icon={faChevronRight}
          className="v-chev mt-1 shrink-0 text-[13px] text-ui-border transition-transform duration-200"
        />
      </summary>
      <div className="pr-3.75 pb-3.75 pl-8.75">{children}</div>
    </details>
  );
}
