"use client";

import { use } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection } from "@/hooks/use-collection";
import type { Event } from "@/types/event";

export default function EventsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const { data: events, loading } = useCollection<Event & { id: string }>({
    path: `clients/${clientId}/events`,
    orderByField: "startDate",
    orderDirection: "desc",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Manage events for this client
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          New Event
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed">
          <p className="text-muted-foreground">No events yet</p>
          <Button variant="outline" className="mt-4">
            <Plus className="mr-2 size-4" />
            Create first event
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              {events.length} event(s) found
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
