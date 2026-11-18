import { Box, Server } from "lucide-react";
import { cn } from "@platform-booking/ui";

/** Kubernetes platforms show a cube, Swarm ones a server stack. */
export function PlatformIcon({
  kubernetes,
  className,
}: {
  kubernetes: boolean;
  className?: string;
}) {
  const Icon = kubernetes ? Box : Server;
  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "h-4 w-4 shrink-0",
        kubernetes ? "text-info" : "text-muted-foreground",
        className,
      )}
    />
  );
}

/** A refused action, with a way to dismiss the message. */
export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground"
    >
      {message}
      <button
        type="button"
        onClick={onDismiss}
        className="ml-2 cursor-pointer underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        Dismiss
      </button>
    </div>
  );
}

/** What a page shows while its data loads. */
export function Loading({ children }: { children: string }) {
  return (
    <div role="status" className="flex items-center justify-center py-16">
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

/** The heading of a page or section, with a small count under it. */
export function PageHeading({
  title,
  level = 1,
  detail,
}: {
  title: string;
  level?: 1 | 2;
  detail: string;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div>
      <Heading className="text-lg font-semibold">{title}</Heading>
      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

/** The trigram of who booked, as a small code chip. */
export function Trigram({ value }: { value: string }) {
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-secondary-foreground">
      {value}
    </span>
  );
}

export const tableHeadClass =
  "px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground";
