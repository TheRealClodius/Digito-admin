"use client";

import { use } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection } from "@/hooks/use-collection";
import { useEventContext } from "@/hooks/use-event-context";
import type { Session } from "@/types/session";

export default function SessionsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const { data: sessions, loading } = useCollection<Session & { id: string }>({
    path: selectedClientId
      ? `clients/${selectedClientId}/events/${eventId}/sessions`
      : "",
    orderByField: "startTime",
    orderDirection: "asc",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">Manage talks, workshops, and panels</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Session
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed">
          <p className="text-muted-foreground">No sessions yet</p>
          <Button variant="outline" className="mt-4">
            <Plus className="mr-2 size-4" />
            Add first session
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              {sessions.length} session(s) found
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
