"use client";

import { use, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useCollection } from "@/hooks/use-collection";
import { useEventContext } from "@/hooks/use-event-context";
import { addDocument, updateDocument, deleteDocument } from "@/lib/firestore";
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

  const { data: posts, loading } = useCollection<Post>({ path: collectionPath });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  function handleNew() { setEditingPost(null); setSubmitStatus("idle"); setSheetOpen(true); }
  function handleEdit(post: Post) { setEditingPost(post); setSubmitStatus("idle"); setSheetOpen(true); }

  async function handleSubmit(data: Record<string, unknown>) {
    if (!collectionPath) return;
    setSubmitStatus("saving");
    try {
      if (editingPost) {
        await updateDocument(collectionPath, editingPost.id, data);
      } else {
        await addDocument(collectionPath, data);
      }
      setSubmitStatus("success");
    } catch (err) {
      setSubmitStatus("error");
      toast.error("Failed to save post");
      console.error(err);
    }
  }

  async function handleDelete() {
    if (!deletingPostId || !collectionPath) return;
    try {
      await deleteDocument(collectionPath, deletingPostId);
      toast.success("Post deleted");
    } catch (err) {
      toast.error("Failed to delete post");
      console.error(err);
    } finally {
      setDeletingPostId(null);
    }
  }

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
