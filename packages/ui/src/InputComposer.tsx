import type { TextareaHTMLAttributes } from "react";
import { Button } from "./Button";
import { countVisibleTextCharacters } from "./text";

export type InputComposerModelOption = {
  id: string;
  label: string;
};

export interface InputComposerProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
> {
  actionLabel?: string;
  label?: string;
  maxLength: number;
  modelOptions?: readonly InputComposerModelOption[];
  modelSelectAriaLabel?: string;
  modelValue?: string;
  onModelChange?: (value: string) => void;
  onSubmit: () => void;
  onValueChange: (value: string) => void;
  submitAriaLabel?: string;
  submitButtonKind?: "auto" | "icon" | "text";
  value: string;
}

export function InputComposer({
  actionLabel = "↑",
  label,
  maxLength,
  modelOptions,
  modelSelectAriaLabel = "AI 모델",
  modelValue,
  onModelChange,
  onSubmit,
  onValueChange,
  placeholder,
  submitAriaLabel = "분석 요청",
  submitButtonKind = "auto",
  value,
  ...props
}: InputComposerProps) {
  const visibleLength = countVisibleTextCharacters(value);
  const isSubmitDisabled = visibleLength === 0 || visibleLength > maxLength;
  const isIconButton =
    submitButtonKind === "icon" ||
    (submitButtonKind === "auto" && actionLabel.trim() === "↑");
  const selectedModelValue = modelValue ?? modelOptions?.[0]?.id ?? "";

  return (
    <div className="nado-composer">
      <textarea
        className="nado-composer__input"
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        value={value}
        {...props}
      />
      <div className="nado-composer__footer">
        <div className="nado-composer__meta">
          {modelOptions && modelOptions.length > 0 ? (
            <select
              aria-label={modelSelectAriaLabel}
              className="nado-composer__model-select"
              onChange={(event) => onModelChange?.(event.target.value)}
              value={selectedModelValue}
            >
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : label ? (
            <span className="nado-composer__label">{label}</span>
          ) : null}
          <span className="nado-composer__count">
            {visibleLength} / {maxLength}
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
