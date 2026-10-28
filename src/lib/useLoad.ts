import { useEffect, useState } from "react";
import { UnauthorizedError } from "./api.ts";

// Loads data once per dependency change; reports 401s so the app can show the login again.
export function useLoad<T>(load: () => Promise<T>, onUnauthorized: () => void, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    load()
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof UnauthorizedError) onUnauthorized();
        else setError(e instanceof Error ? e.message : "Er ging iets mis");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error };
}
