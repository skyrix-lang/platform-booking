import { useState, useEffect, useCallback } from "react";
import type { Platform } from "@booking/shared";
import { fetchPlatforms } from "@/services/api.ts";

const API_URL = import.meta.env.VITE_API_URL || "";

export function usePlatforms() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlatforms = useCallback(async () => {
    try {
      const data = await fetchPlatforms();
      setPlatforms(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load platforms",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlatforms();
  }, [loadPlatforms]);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/events`);
    es.onmessage = (event) => {
      if (event.data === "platforms-updated") {
        loadPlatforms();
      }
    };
    return () => es.close();
  }, [loadPlatforms]);

  return { platforms, setPlatforms, loading, error, setError };
}
