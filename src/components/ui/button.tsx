import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "dark" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600",
  dark: "bg-ink text-white hover:bg-ink-soft",
  secondary:
    "border border-line-strong bg-card text-ink hover:bg-canvas hover:border-[#d6d9df]",
  ghost: "text-ink-soft hover:text-ink",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-[34px] px-3.5 text-[13px] gap-2 rounded-[9px]",
  md: "px-5 py-3 text-sm gap-2 rounded-xl",
};

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconDefinition;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * Botão polimórfico: vira <Link> quando recebe `href`, senão <button>.
 * Variantes e tamanhos compartilhados pelas duas telas.
 */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center font-semibold transition-colors",
    sizeClasses[size],
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
