import type { TextareaHTMLAttributes } from "react";
import { Button } from "./Button";

export interface InputComposerProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
> {
  actionLabel?: string;
  maxLength: number;
  onSubmit: () => void;
  onValueChange: (value: string) => void;
  value: string;
}

export function InputComposer({
  actionLabel = "Analyze",
  maxLength,
  onSubmit,
  onValueChange,
  placeholder,
  value,
  ...props
}: InputComposerProps) {
  const trimmedLength = value.trim().length;
  const isSubmitDisabled = trimmedLength === 0 || value.length > maxLength;

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
        <span className="nado-composer__count">
          {value.length} / {maxLength}
        </span>
        <Button disabled={isSubmitDisabled} onClick={onSubmit}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
