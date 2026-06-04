import { useCallback, useEffect, useState } from "react";
import { api, isAuthenticated } from "@/lib/apiClient";

/** Dev override: force boost UI on in browser builds. */
export function devServerBoostForced(): boolean {
  return import.meta.env.VITE_DEV_SERVER_BOOST === "true";
}

export async function fetchServerBoostStatus(): Promise<boolean> {
  if (devServerBoostForced()) return true;
  if (!isAuthenticated()) return false;
  try {
    const res = await api.getBoostStatus();
    return Boolean(res.isBoosting);
  } catch {
    return false;
  }
}

/** Polls server for Discord guild premium boost (when bot + guild env are configured). */
export function useServerBoost(isOnline: boolean): { isBoosting: boolean; loading: boolean; refresh: () => void } {
  const [isBoosting, setIsBoosting] = useState(devServerBoostForced());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isOnline && !devServerBoostForced()) {
      setIsBoosting(false);
      return;
    }
    setLoading(true);
    try {
      setIsBoosting(await fetchServerBoostStatus());
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isBoosting, loading, refresh };
}
