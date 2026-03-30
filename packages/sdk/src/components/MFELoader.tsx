import React, { Suspense } from "react";
import { useMFE } from "../hooks/useMFE";

interface MFELoaderProps {
  name: string;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  props?: Record<string, unknown>;
}

/**
 * Declarative component to load and render an MFE by name.
 *
 * @example
 * <MFELoader name="checkout" fallback={<Spinner />} />
 */
export function MFELoader({
  name,
  fallback,
  errorFallback,
  props = {},
}: MFELoaderProps) {
  const { Component, loading, error } = useMFE(name);

  if (loading) {
    return <>{fallback ?? <div>Loading {name}...</div>}</>;
  }

  if (error) {
    return (
      <>
        {errorFallback ?? (
          <div style={{ color: "red", padding: 16 }}>
            Failed to load "{name}": {error.message}
          </div>
        )}
      </>
    );
  }

  if (!Component) {
    return <div>MFE "{name}" not found</div>;
  }

  return (
    <Suspense fallback={fallback ?? <div>Loading {name}...</div>}>
      <Component {...props} />
    </Suspense>
  );
}
