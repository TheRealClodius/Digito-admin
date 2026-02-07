"use client";

import { use } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection } from "@/hooks/use-collection";
import { useEventContext } from "@/hooks/use-event-context";
import type { WhitelistEntry } from "@/types/whitelist-entry";

export default function WhitelistPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const { data: entries, loading } = useCollection<WhitelistEntry & { id: string }>({
    path: selectedClientId
      ? `clients/${selectedClientId}/events/${eventId}/whitelist`
      : "",
    orderByField: "addedAt",
    orderDirection: "desc",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Whitelist</h1>
          <p className="text-muted-foreground">Manage pre-approved attendees</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Entry
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed">
          <p className="text-muted-foreground">No whitelist entries yet</p>
          <Button variant="outline" className="mt-4">
            <Plus className="mr-2 size-4" />
            Add first entry
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              {entries.length} entry(ies) found
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
