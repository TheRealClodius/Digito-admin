"use client";

import { use } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { PostsTable } from "@/components/tables/posts-table";
import { PostForm } from "@/components/forms/post-form";
import type { Post } from "@/types/post";

export default function PostsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/posts`
    : "";

  const {
    data: posts,
    loading,
    sheetOpen,
    setSheetOpen,
    editingEntity: editingPost,
    deletingEntityId: deletingPostId,
    setDeletingEntityId: setDeletingPostId,
    submitStatus,
    handleNew,
    handleEdit,
    handleSubmit,
    handleDelete,
  } = useCrudPage<Post>({
    collectionPath,
    entityName: "post",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          <p className="text-muted-foreground">Manage event posts and announcements</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          Add Post
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <PostsTable
          posts={posts}
          onEdit={handleEdit}
          onDelete={(id) => setDeletingPostId(id)}
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingPost ? "Edit Post" : "New Post"}</SheetTitle>
            <SheetDescription>
              {editingPost ? "Update the post details." : "Create a new post."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <PostForm
              defaultValues={editingPost ? {
                imageUrl: editingPost.imageUrl,
                description: editingPost.description ?? null,
                authorName: editingPost.authorName ?? null,
                authorAvatarUrl: editingPost.authorAvatarUrl ?? null,
              } : undefined}
              onSubmit={handleSubmit}
              onCancel={() => setSheetOpen(false)}
              submitStatus={submitStatus}
              storagePath={collectionPath}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingPostId} onOpenChange={(open) => !open && setDeletingPostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
