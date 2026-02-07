"use client";

import { use } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection } from "@/hooks/use-collection";
import { useEventContext } from "@/hooks/use-event-context";
import type { Post } from "@/types/post";

export default function PostsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const { data: posts, loading } = useCollection<Post & { id: string }>({
    path: selectedClientId
      ? `clients/${selectedClientId}/events/${eventId}/posts`
      : "",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          <p className="text-muted-foreground">Manage event posts and announcements</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Post
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed">
          <p className="text-muted-foreground">No posts yet</p>
          <Button variant="outline" className="mt-4">
            <Plus className="mr-2 size-4" />
            Create first post
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <p className="text-sm text-muted-foreground col-span-full">
            {posts.length} post(s) found
          </p>
        </div>
      )}
    </div>
  );
}
