import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/cn";

type IconBadgeProps = {
  icon: IconDefinition;
  className?: string;
  iconClassName?: string;
};

export function IconBadge({ icon, className, iconClassName }: IconBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl",
        "size-11 bg-brand-50 text-brand-600",
        className,
      )}
    >
      <FontAwesomeIcon icon={icon} className={cn("text-lg", iconClassName)} />
    </span>
  );
}
