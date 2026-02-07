"use client";

import { use } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection } from "@/hooks/use-collection";
import { useEventContext } from "@/hooks/use-event-context";
import type { Stand } from "@/types/stand";

export default function StandsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const { data: stands, loading } = useCollection<Stand & { id: string }>({
    path: selectedClientId
      ? `clients/${selectedClientId}/events/${eventId}/stands`
      : "",
    orderByField: "name",
    orderDirection: "asc",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Stands</h1>
          <p className="text-muted-foreground">Manage booth locations for this event</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Stand
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : stands.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed">
          <p className="text-muted-foreground">No stands yet</p>
          <Button variant="outline" className="mt-4">
            <Plus className="mr-2 size-4" />
            Add first stand
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              {stands.length} stand(s) found
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
