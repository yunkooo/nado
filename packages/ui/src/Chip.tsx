import type { ButtonHTMLAttributes } from "react";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  prefix?: string;
}

export function Chip({
  className,
  label,
  prefix,
  type = "button",
  ...props
}: ChipProps) {
  const classes = ["nado-chip", className].filter(Boolean).join(" ");

  return (
    <button className={classes} type={type} {...props}>
      {prefix ? <span className="nado-chip__prefix">{prefix}</span> : null}
      <span className="nado-chip__label">{label}</span>
    </button>
  );
}
