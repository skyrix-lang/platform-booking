import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  getListBookingHistoryQueryKey,
  getListBookingsQueryKey,
  getListPlatformsQueryKey,
} from "@platform-booking/api";

// The BFF announces changes on /api/events (apps/bff/src/live-updates.ts), so
// every open page shows a booking or a platform as soon as someone changes it.
// The event names what changed; the data is then refetched through the API.

const queriesFor: Record<string, (() => readonly unknown[])[]> = {
  "bookings-updated": [getListBookingsQueryKey, getListBookingHistoryQueryKey],
  "platforms-updated": [getListPlatformsQueryKey],
};

/** Listens for changes while mounted. Call it once, in the app's layout. */
export function useLiveUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const refetch = (keys: (() => readonly unknown[])[]) => {
      for (const key of keys) {
        void queryClient.invalidateQueries({ queryKey: key() });
      }
    };
    let source: EventSource | undefined;
    const connect = () => {
      source = new EventSource("/api/events");
      // changes may have been missed before the stream opened (since the
      // page's first fetch) or while it was lost: refetch on every open.
      source.onopen = () => refetch(Object.values(queriesFor).flat());
      source.onmessage = (event: MessageEvent<string>) => {
        refetch(queriesFor[event.data] ?? []);
      };
    };
    // a stream opened before the page's load event can hold that event back
    // for as long as it stays open, in webkit: safari's spinner never stops,
    // and the nightly's page.goto waited 30 s for it. so it opens after.
    if (document.readyState === "complete") connect();
    else window.addEventListener("load", connect, { once: true });
    return () => {
      window.removeEventListener("load", connect);
      source?.close();
    };
  }, [queryClient]);
}
