import { useMemo } from "react";
import { useCollection } from "@/hooks/use-collection";
import type { Client } from "@/types/client";

export interface AggregateStats {
  totalClients: number;
  totalEvents: number;
  activeEvents: number;
  totalParticipants: number;
}

/**
 * Hook to fetch aggregate statistics across all clients (for SuperAdmin dashboard)
 *
 * NOTE: This is a simplified initial implementation that only counts clients.
 * Full aggregation of events and participants across all clients requires optimization
 * (see plan notes about server-side aggregation, Cloud Functions, or caching).
 *
 * @returns Object containing aggregate stats, loading state, and error
 */
export function useAggregateStats() {
  const { data: clients, loading: clientsLoading, error: clientsError } =
    useCollection<Client>({
      path: "clients",
      orderByField: "name",
      orderDirection: "asc",
    });

  const stats = useMemo<AggregateStats>(() => {
    if (!clients) {
      return {
        totalClients: 0,
        totalEvents: 0,
        activeEvents: 0,
        totalParticipants: 0,
      };
    }

    // Currently implemented: Total clients count
    // TODO: Implement cross-client event aggregation
    // TODO: Implement cross-event participant aggregation
    // For production with many clients, consider:
    // - Server-side aggregation with Cloud Functions
    // - Firestore aggregation queries
    // - Caching with TTL
    return {
      totalClients: clients.length,
      totalEvents: 0, // TODO: Aggregate from all clients
      activeEvents: 0, // TODO: Count ongoing events across clients
      totalParticipants: 0, // TODO: Aggregate whitelist counts
    };
  }, [clients]);

  return {
    stats,
    loading: clientsLoading,
    error: clientsError,
  };
}
