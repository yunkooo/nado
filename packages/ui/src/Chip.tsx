import type { ButtonHTMLAttributes } from "react";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  as?: "button" | "span";
  label: string;
  prefix?: string;
}

export function Chip({
  as = "button",
  className,
  disabled,
  label,
  prefix,
  type = "button",
  ...props
}: ChipProps) {
  const classes = ["nado-chip", className].filter(Boolean).join(" ");
  const content = (
    <>
      {prefix ? <span className="nado-chip__prefix">{prefix}</span> : null}
      <span className="nado-chip__label">{label}</span>
    </>
  );

  if (as === "span") {
    return (
      <span
        aria-disabled={disabled ? true : undefined}
        className={classes}
        role={disabled ? undefined : props.role}
      >
        {content}
      </span>
    );
  }

  return (
    <button className={classes} disabled={disabled} type={type} {...props}>
      {content}
    </button>
  );
}
