import { useMemo } from "react";
import { useCollection } from "@/hooks/use-collection";
import { getEventStatus } from "@/lib/event-status";
import type { Event } from "@/types/event";

export interface ClientStats {
  totalEvents: number;
  activeEvents: number;
  upcomingEvents: number;
  pastEvents: number;
}

/**
 * Hook to fetch and calculate statistics for a client's events
 * @param clientId - The client ID to fetch events for
 * @param now - Optional date to use for status calculations (defaults to current date)
 * @returns Object containing stats, loading state, and error
 */
export function useClientStats(clientId: string, now?: Date) {
  const { data: events, loading, error } = useCollection<Event>({
    path: `clients/${clientId}/events`,
    orderByField: "name",
    orderDirection: "asc",
  });

  const stats = useMemo<ClientStats>(() => {
    if (!events) {
      return {
        totalEvents: 0,
        activeEvents: 0,
        upcomingEvents: 0,
        pastEvents: 0,
      };
    }

    const statuses = events.map((event) => getEventStatus(event, now));

    return {
      totalEvents: events.length,
      activeEvents: statuses.filter((s) => s === "ongoing").length,
      upcomingEvents: statuses.filter((s) => s === "upcoming").length,
      pastEvents: statuses.filter((s) => s === "past").length,
    };
  }, [events, now]);

  return { stats, loading, error };
}
