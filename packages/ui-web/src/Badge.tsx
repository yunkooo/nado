import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  size?: BadgeSize;
  tone?: BadgeTone;
}

export function Badge({
  children,
  className,
  size = "sm",
  tone = "neutral",
  ...props
}: BadgeProps) {
  const classes = [
    "nado-badge",
    `nado-badge--tone-${tone}`,
    `nado-badge--size-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
