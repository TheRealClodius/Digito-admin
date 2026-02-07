"use client";

import { use } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCollection } from "@/hooks/use-collection";
import { useEventContext } from "@/hooks/use-event-context";
import type { UserProfile } from "@/types/user-profile";

export default function UsersPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const { data: users, loading } = useCollection<UserProfile & { id: string }>({
    path: selectedClientId
      ? `clients/${selectedClientId}/events/${eventId}/users`
      : "",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Users</h1>
          <p className="text-muted-foreground">
            Registered event attendees
            <Badge variant="secondary" className="ml-2">
              Read Only
            </Badge>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed">
          <p className="text-muted-foreground">No registered users yet</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              {users.length} registered user(s)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
