import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveUpdates } from "./live-updates";

class FakeEventSource {
  static opened: FakeEventSource[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  constructor(readonly url: string) {
    FakeEventSource.opened.push(this);
  }
  close() {
    this.closed = true;
  }
}

function renderLiveUpdates() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useLiveUpdates(), { wrapper }), queryClient };
}

/** Pretends the page is still loading, as when react mounts before `load`. */
function stillLoading() {
  vi.spyOn(document, "readyState", "get").mockReturnValue("interactive");
}

describe("useLiveUpdates", () => {
  beforeEach(() => {
    FakeEventSource.opened = [];
    vi.stubGlobal("EventSource", FakeEventSource);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("listens at once on a loaded page", () => {
    const { unmount } = renderLiveUpdates();

    expect(FakeEventSource.opened.map((source) => source.url)).toEqual([
      "/api/events",
    ]);
    unmount();
    expect(FakeEventSource.opened[0]?.closed).toBe(true);
  });

  it("waits for the page's load event, which an open stream holds back in webkit", () => {
    stillLoading();
    const { unmount } = renderLiveUpdates();
    expect(FakeEventSource.opened).toHaveLength(0);

    window.dispatchEvent(new Event("load"));

    expect(FakeEventSource.opened).toHaveLength(1);
    unmount();
    expect(FakeEventSource.opened[0]?.closed).toBe(true);
  });

  it("refetches when the stream opens, for changes made before it did", () => {
    const { queryClient } = renderLiveUpdates();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    FakeEventSource.opened[0]?.onopen?.();

    expect(invalidate).toHaveBeenCalledTimes(3);
  });

  it("never listens if it unmounts before the load event", () => {
    stillLoading();
    const { unmount } = renderLiveUpdates();
    unmount();

    window.dispatchEvent(new Event("load"));

    expect(FakeEventSource.opened).toHaveLength(0);
  });
});
