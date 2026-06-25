import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

interface ChipBaseProps {
  as?: "button" | "span";
  disabled?: boolean;
  label: string;
  prefix?: string;
}

type ChipButtonProps = ChipBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    as?: "button";
  };

type ChipSpanProps = ChipBaseProps &
  HTMLAttributes<HTMLSpanElement> & {
    as: "span";
  };

export type ChipProps = ChipButtonProps | ChipSpanProps;

export function Chip(props: ChipProps) {
  const { as = "button", className, disabled, label, prefix } = props;
  const classes = ["nado-chip", className].filter(Boolean).join(" ");
  const content = (
    <>
      {prefix ? <span className="nado-chip__prefix">{prefix}</span> : null}
      <span className="nado-chip__label">{label}</span>
    </>
  );

  if (as === "span") {
    const {
      as: _as,
      className: _className,
      disabled: _disabled,
      label: _label,
      prefix: _prefix,
      ...spanProps
    } = props as ChipSpanProps;

    return (
      <span
        {...spanProps}
        aria-disabled={disabled ? true : spanProps["aria-disabled"]}
        className={classes}
        role={disabled ? undefined : spanProps.role}
      >
        {content}
      </span>
    );
  }

  const {
    as: _as,
    className: _className,
    disabled: _disabled,
    label: _label,
    prefix: _prefix,
    type = "button",
    ...buttonProps
  } = props as ChipButtonProps;

  return (
    <button
      className={classes}
      disabled={disabled}
      type={type}
      {...buttonProps}
    >
      {content}
    </button>
  );
}
