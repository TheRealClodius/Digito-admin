"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

interface UseApiCollectionOptions {
  /** API route path, e.g. "/api/clients" */
  apiPath: string;
  /** React Query cache key */
  queryKey: string[];
  /** Whether to fetch (defaults to true). Set false to skip. */
  enabled?: boolean;
  /** Polling interval in ms (optional) */
  refetchInterval?: number;
}

/**
 * Hook to fetch a collection from an API route using React Query.
 * API-based collection hook for fetching paginated data from REST endpoints.
 *
 * Returns `{ data, loading, error }` matching the same interface.
 */
export function useApiCollection<T>(options: UseApiCollectionOptions): {
  data: T[];
  loading: boolean;
  error: Error | null;
} {
  const { apiPath, queryKey, enabled = true, refetchInterval } = options;

  const isEnabled = enabled && apiPath.length > 0;

  const { data, isLoading, error } = useQuery<T[]>({
    queryKey,
    queryFn: () => apiFetch<T[]>(apiPath),
    enabled: isEnabled,
    refetchInterval,
  });

  return {
    data: data ?? [],
    loading: isEnabled ? isLoading : false,
    error: error instanceof Error ? error : null,
  };
}
