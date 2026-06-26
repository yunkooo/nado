import type { HTMLAttributes, ReactNode } from "react";

export type CardPadding = "sm" | "md" | "lg" | "xl";
export type CardTone = "surface" | "muted" | "elevated";
export type CardRadius = "sm" | "md" | "composer";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: CardPadding;
  radius?: CardRadius;
  tone?: CardTone;
}

export function Card({
  children,
  className,
  padding = "md",
  radius = "md",
  tone = "surface",
  ...props
}: CardProps) {
  const classes = [
    "nado-card",
    `nado-card--padding-${padding}`,
    `nado-card--tone-${tone}`,
    `nado-card--radius-${radius}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
