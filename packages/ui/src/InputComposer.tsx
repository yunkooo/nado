import type { TextareaHTMLAttributes } from "react";
import { Button } from "./Button";

export interface InputComposerProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
> {
  actionLabel?: string;
  label?: string;
  maxLength: number;
  onSubmit: () => void;
  onValueChange: (value: string) => void;
  submitAriaLabel?: string;
  submitButtonKind?: "auto" | "icon" | "text";
  value: string;
}

export function InputComposer({
  actionLabel = "↑",
  label = "기본 분석",
  maxLength,
  onSubmit,
  onValueChange,
  placeholder,
  submitAriaLabel = "분석 요청",
  submitButtonKind = "auto",
  value,
  ...props
}: InputComposerProps) {
  const trimmedLength = value.trim().length;
  const isSubmitDisabled = trimmedLength === 0 || value.length > maxLength;
  const isIconButton =
    submitButtonKind === "icon" ||
    (submitButtonKind === "auto" && actionLabel.trim() === "↑");

  return (
    <div className="nado-composer">
      <textarea
        className="nado-composer__input"
        maxLength={maxLength}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        value={value}
        {...props}
      />
      <div className="nado-composer__footer">
        <div className="nado-composer__meta">
          <span className="nado-composer__label">{label}</span>
          <span className="nado-composer__count">
            {value.length} / {maxLength}
          </span>
        </div>
        <Button
          aria-label={isIconButton ? submitAriaLabel : undefined}
          disabled={isSubmitDisabled}
          onClick={onSubmit}
          size={isIconButton ? "icon" : "md"}
          variant={isIconButton ? "send" : "primary"}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
