import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "forest";
  size?: "sm" | "md";
};

const variantClassName: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow-sm)] hover:bg-[var(--accent-hover)] disabled:opacity-40",
  forest:
    "border border-[var(--border-strong)] bg-[var(--brand-forest-medium)] text-[var(--text)] shadow-[var(--shadow-sm)] hover:bg-[var(--brand-forest-dark)] disabled:opacity-40",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface-hover)] disabled:opacity-40",
  ghost:
    "bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] disabled:opacity-40",
  danger:
    "border border-[var(--danger)]/30 bg-[var(--danger-muted)] text-[var(--danger)] hover:opacity-90 disabled:opacity-40",
};

const sizeClassName = {
  sm: "px-3 py-2 text-xs font-semibold",
  md: "px-4 py-2.5 text-sm font-semibold",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-lg)] font-medium transition disabled:cursor-not-allowed ${variantClassName[variant]} ${sizeClassName[size]} ${className}`}
      {...props}
    />
  );
}
