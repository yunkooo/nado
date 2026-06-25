import type { HTMLAttributes, ReactNode } from "react";

export type StackGap = "xs" | "sm" | "md" | "lg" | "xl";
export type StackDirection = "vertical" | "horizontal";
export type StackAlign = "start" | "center" | "end" | "stretch";

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  align?: StackAlign;
  children: ReactNode;
  direction?: StackDirection;
  gap?: StackGap;
}

export function Stack({
  align = "stretch",
  children,
  className,
  direction = "vertical",
  gap = "md",
  ...props
}: StackProps) {
  const classes = [
    "nado-stack",
    `nado-stack--gap-${gap}`,
    `nado-stack--direction-${direction}`,
    `nado-stack--align-${align}`,
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
