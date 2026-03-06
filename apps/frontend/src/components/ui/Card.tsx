import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}

const paddingStyles = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-surface-900 rounded-sm shadow-card border border-surface-200 dark:border-surface-800 ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
