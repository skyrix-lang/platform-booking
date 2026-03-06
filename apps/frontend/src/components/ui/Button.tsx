import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 border border-primary-600 hover:border-primary-700",
  secondary: [
    "bg-surface-50 text-surface-700 border border-surface-300 hover:bg-surface-100 active:bg-surface-200",
    "dark:bg-surface-800 dark:text-surface-200 dark:border-surface-700 dark:hover:bg-surface-700 dark:active:bg-surface-600",
  ].join(" "),
  ghost: [
    "text-surface-600 hover:bg-surface-100 hover:text-surface-900 active:bg-surface-200",
    "dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200 dark:active:bg-surface-700",
  ].join(" "),
  danger: [
    "bg-error-50 text-error-700 border border-error-200 hover:bg-error-100 active:bg-error-200",
    "dark:bg-error-500/10 dark:text-error-400 dark:border-error-500/30 dark:hover:bg-error-500/20 dark:active:bg-error-500/30",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-900 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
