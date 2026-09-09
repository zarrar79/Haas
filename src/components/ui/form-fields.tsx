import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { FORM_CONTROL_CLASS } from "@/components/ui/form-control";

const LABEL_CLASS =
  "flex flex-col gap-1.5 text-sm text-[var(--text-muted)]";

function FieldLabel({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`${LABEL_CLASS} ${className}`.trim()}>
      <span className="font-medium text-[var(--text)]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

type FormSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className" | "onChange"
> & {
  label: string;
  onChange: (value: string) => void;
  className?: string;
  controlClassName?: string;
};

export function FormSelect({
  label,
  onChange,
  className = "",
  controlClassName = "",
  required,
  children,
  ...props
}: FormSelectProps) {
  return (
    <FieldLabel label={label} required={required} className={className}>
      <select
        className={`${FORM_CONTROL_CLASS} ${controlClassName}`.trim()}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      >
        {children}
      </select>
    </FieldLabel>
  );
}

type FormTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "onChange"
> & {
  label: string;
  onChange: (value: string) => void;
  className?: string;
  controlClassName?: string;
};

export function FormTextarea({
  label,
  onChange,
  className = "",
  controlClassName = "",
  required,
  ...props
}: FormTextareaProps) {
  return (
    <FieldLabel label={label} required={required} className={className}>
      <textarea
        className={`${FORM_CONTROL_CLASS} ${controlClassName}`.trim()}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </FieldLabel>
  );
}

type FormInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "onChange"
> & {
  label: string;
  onChange: (value: string) => void;
  className?: string;
  controlClassName?: string;
};

export function FormInput({
  label,
  onChange,
  className = "",
  controlClassName = "",
  required,
  ...props
}: FormInputProps) {
  return (
    <FieldLabel label={label} required={required} className={className}>
      <input
        className={`${FORM_CONTROL_CLASS} ${controlClassName}`.trim()}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </FieldLabel>
  );
}

export function FormCheckbox({
  label,
  checked,
  onChange,
  disabled,
  className = "",
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={`flex items-center gap-2 text-sm text-[var(--text)] ${className}`.trim()}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
