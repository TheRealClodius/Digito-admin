import { useMemo } from "react";
import { useApiCollection } from "@/hooks/use-api-collection";
import { getEventStatus } from "@/lib/event-status";
import type { Event } from "@/types/event";

export interface ClientStats {
  totalEvents: number;
  activeEvents: number;
  upcomingEvents: number;
  pastEvents: number;
}

export function useClientStats(clientId: string, now?: Date) {
  const { data: events, loading, error } = useApiCollection<Event>({
    apiPath: `/api/clients/${clientId}/events`,
    queryKey: ["clients", clientId, "events"],
    enabled: !!clientId,
  });

  const stats = useMemo<ClientStats>(() => {
    if (!events || events.length === 0) {
      return { totalEvents: 0, activeEvents: 0, upcomingEvents: 0, pastEvents: 0 };
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
