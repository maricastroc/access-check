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
  return (
    <details
      id={anchorId}
      className="mb-2 scroll-mt-24 rounded-xl border border-line bg-card transition-[border-color] hover:border-line-hover"
    >
      <summary className="flex cursor-pointer items-center gap-3 px-3.75 py-3.25">
        <span className={`size-1.75 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium">{title}</div>
          <div className="mt-0.5 font-mono text-[11px] text-faint">{subtitle}</div>
        </div>
        {nodes > 1 && (
          <span className="shrink-0 rounded-md bg-chip px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-muted">
            {nodes} elem.
          </span>
        )}
        {where && (
          <span className="max-w-35 truncate rounded-md bg-chip px-2 py-0.75 font-mono text-[11px] text-faint">
            {where}
          </span>
        )}
        <FontAwesomeIcon
          icon={faChevronRight}
          className="v-chev shrink-0 text-[13px] text-ui-border transition-transform duration-200"
        />
      </summary>
      <div className="pr-3.75 pb-3.75 pl-8.75">{children}</div>
    </details>
  );
}
