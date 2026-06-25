import type { HTMLAttributes, ReactNode } from "react";

export type TextSize = "xs" | "sm" | "md" | "lg" | "xl";
export type TextWeight = "regular" | "medium" | "bold" | "heavy";
export type TextTone = "default" | "muted" | "primary" | "danger";
export type TextAlign = "start" | "center" | "end";

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  align?: TextAlign;
  children: ReactNode;
  size?: TextSize;
  tone?: TextTone;
  weight?: TextWeight;
}

export function Text({
  align = "start",
  children,
  className,
  size = "md",
  tone = "default",
  weight = "regular",
  ...props
}: TextProps) {
  const classes = [
    "nado-text",
    `nado-text--size-${size}`,
    `nado-text--weight-${weight}`,
    `nado-text--tone-${tone}`,
    `nado-text--align-${align}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <p className={classes} {...props}>
      {children}
    </p>
  );
}
