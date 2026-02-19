"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

interface UseApiDocumentOptions {
  /** API route path, e.g. "/api/clients/123" */
  apiPath: string;
  /** React Query cache key */
  queryKey: string[];
  /** Whether to fetch (defaults to true). Set false to skip. */
  enabled?: boolean;
}

/**
 * Hook to fetch a single document from an API route using React Query.
 * Drop-in replacement for the Firestore-based `useDocument`.
 *
 * Returns `{ data, loading, error }` matching the same interface.
 */
export function useApiDocument<T>(options: UseApiDocumentOptions): {
  data: T | null;
  loading: boolean;
  error: Error | null;
} {
  const { apiPath, queryKey, enabled = true } = options;

  const isEnabled = enabled && apiPath.length > 0;

  const { data, isLoading, error } = useQuery<T>({
    queryKey,
    queryFn: () => apiFetch<T>(apiPath),
    enabled: isEnabled,
  });

  return {
    data: data ?? null,
    loading: isEnabled ? isLoading : false,
    error: error instanceof Error ? error : null,
  };
}
