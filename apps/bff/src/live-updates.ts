import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

// Server-sent events at GET /api/events: every open page hears when bookings or
// platforms change, and refetches them. The previous version did the same.
// The events carry no data, only what changed, so the page reads it through
// the API as usual. Listeners are in this process's memory: one instance of
// the app (docs/decisions.md, "Live updates over server-sent events").

export type LiveEvent = "bookings-updated" | "platforms-updated";

const listeners = new Set<(event: LiveEvent) => void>();
const closers = new Set<() => void>();

/** Tells every open page that `event` happened. */
export function broadcast(event: LiveEvent) {
  for (const listener of listeners) listener(event);
}

/** Ends every open stream, so the server can stop (src/server.ts). */
export function closeLiveUpdates() {
  for (const close of closers) close();
}

/** How many pages are listening: for tests. */
export function liveListenerCount() {
  return listeners.size;
}

// Proxies drop a connection that stays silent; a comment line every so often
// keeps it open and is ignored by the browser.
const KEEP_ALIVE_MS = 25_000;

export const liveUpdates = new Hono().get("/", (c) => {
  // streamSSE sets Cache-Control: no-cache. This tells nginx-style proxies
  // to pass each event on at once.
  c.header("X-Accel-Buffering", "no");
  return streamSSE(c, async (stream) => {
    const send = (event: LiveEvent) => {
      void stream.writeSSE({ data: event });
    };
    let close = () => {};
    const closed = new Promise<void>((resolve) => {
      close = resolve;
    });
    stream.onAbort(close);
    listeners.add(send);
    closers.add(close);
    const keepAlive = setInterval(() => {
      void stream.write(": keep-alive\n\n");
    }, KEEP_ALIVE_MS);
    try {
      // Opens the stream at once, so the browser knows it's connected.
      await stream.write(": connected\n\n");
      await closed;
    } finally {
      clearInterval(keepAlive);
      listeners.delete(send);
      closers.delete(close);
    }
  });
});
