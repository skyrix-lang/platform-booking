import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-500 active:bg-primary-700 shadow-sm",
  secondary: [
    "bg-white text-surface-700 border border-surface-300 hover:bg-surface-50 active:bg-surface-100 shadow-sm",
    "dark:bg-surface-700 dark:text-surface-200 dark:border-surface-600 dark:hover:bg-surface-600 dark:active:bg-surface-700",
  ].join(" "),
  ghost: [
    "text-surface-600 hover:bg-surface-100 hover:text-surface-900 active:bg-surface-200",
    "dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-surface-100 dark:active:bg-surface-600",
  ].join(" "),
  danger:
    "bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300 dark:bg-red-600/20 dark:text-red-400 dark:hover:bg-red-600/30 dark:active:bg-red-600/40",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
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
      className={`inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-surface-900 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
