import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}

const paddingStyles = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-surface-800 rounded-lg shadow-card border border-surface-200 dark:border-surface-700 transition-colors ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
