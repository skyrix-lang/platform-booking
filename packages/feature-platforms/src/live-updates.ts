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
    const source = new EventSource("/api/events");
    let opened = false;
    source.onopen = () => {
      // After a lost connection, changes may have been missed meanwhile.
      if (opened) refetch(Object.values(queriesFor).flat());
      opened = true;
    };
    source.onmessage = (event: MessageEvent<string>) => {
      refetch(queriesFor[event.data] ?? []);
    };
    return () => source.close();
  }, [queryClient]);
}
