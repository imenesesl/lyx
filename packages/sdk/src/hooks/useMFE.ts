import { useState, useEffect, type ComponentType } from "react";
import { loadMFE } from "../loader";

interface UseMFEResult {
  Component: ComponentType<any> | null;
  loading: boolean;
  error: Error | null;
}

/**
 * React hook to dynamically load an MFE by name.
 *
 * @example
 * const { Component, loading, error } = useMFE("checkout");
 * if (loading) return <Spinner />;
 * if (Component) return <Component />;
 */
export function useMFE(name: string): UseMFEResult {
  const [Component, setComponent] = useState<ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadMFE(name)
      .then((Comp) => {
        if (!cancelled) setComponent(() => Comp);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  return { Component, loading, error };
}
