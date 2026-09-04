import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "accent" | "secondary" | "tertiary" | "dark" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-ink text-surface hover:bg-ink-2 disabled:bg-canvas disabled:text-disabled disabled:border disabled:border-hairline",
  dark: "bg-ink text-surface hover:bg-ink-2 disabled:bg-canvas disabled:text-disabled",
  accent: "bg-serious text-surface hover:brightness-110 disabled:bg-canvas disabled:text-disabled",
  secondary:
    "border border-border bg-surface text-ink hover:bg-band disabled:border-hairline disabled:bg-canvas disabled:text-disabled",
  tertiary: "text-steel hover:underline disabled:text-disabled disabled:no-underline",
  ghost: "text-steel hover:underline disabled:text-disabled disabled:no-underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[13.5px] gap-2",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-[54px] px-8 text-[16.5px] gap-2.5",
};

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconDefinition;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & { href?: undefined };

type ButtonAsLink = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(
    "inline-flex cursor-pointer items-center justify-center font-semibold transition-colors disabled:cursor-default",
    variant === "tertiary" ? "" : sizeClasses[size],
    variantClasses[variant],
    className,
  );

  const content = (
    <>
      {icon && <FontAwesomeIcon icon={icon} className="text-[0.95em]" />}
      {children}
    </>
  );

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonAsButton)}>
      {content}
    </button>
  );
}
