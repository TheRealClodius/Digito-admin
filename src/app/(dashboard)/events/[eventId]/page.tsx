"use client";

import { use } from "react";
import {
  ShoppingBag,
  Mic2,
  Sparkles,
  Users,
  ListChecks,
} from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { useCollection } from "@/hooks/use-collection";
import { useEventContext } from "@/hooks/use-event-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { Brand } from "@/types/brand";
import type { Session } from "@/types/session";
import type { Happening } from "@/types/happening";
import type { Participant } from "@/types/participant";
import type { WhitelistEntry } from "@/types/whitelist-entry";

export default function EventOverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const basePath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}`
    : "";

  const { data: brands, loading: brandsLoading } = useCollection<Brand & { id: string }>({
    path: basePath ? `${basePath}/brands` : "",
  });
  const { data: sessions, loading: sessionsLoading } = useCollection<Session & { id: string }>({
    path: basePath ? `${basePath}/sessions` : "",
  });
  const { data: happenings, loading: happeningsLoading } = useCollection<Happening & { id: string }>({
    path: basePath ? `${basePath}/happenings` : "",
  });
  const { data: participants, loading: participantsLoading } = useCollection<Participant & { id: string }>({
    path: basePath ? `${basePath}/participants` : "",
  });
  const { data: whitelist, loading: whitelistLoading } = useCollection<WhitelistEntry & { id: string }>({
    path: basePath ? `${basePath}/whitelist` : "",
  });
  const isLoading =
    brandsLoading ||
    sessionsLoading ||
    happeningsLoading ||
    participantsLoading ||
    whitelistLoading;

  if (!selectedClientId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">
          Select a client from the sidebar to view event details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Event Overview</h1>
        <p className="text-muted-foreground">
          Summary of event data and quick actions
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Total Brands"
            value={brands.length}
            icon={ShoppingBag}
          />
          <StatsCard
            title="Total Sessions"
            value={sessions.length}
            icon={Mic2}
          />
          <StatsCard
            title="Total Happenings"
            value={happenings.length}
            icon={Sparkles}
          />
          <StatsCard
            title="Participants"
            value={participants.length}
            icon={Users}
          />
          <StatsCard
            title="Whitelisted"
            value={whitelist.length}
            icon={ListChecks}
          />
        </div>
      )}
    </div>
  );
}
