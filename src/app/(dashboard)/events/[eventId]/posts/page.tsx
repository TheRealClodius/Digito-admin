"use client";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { useUpload } from "@/hooks/use-upload";
import { CrudPage } from "@/components/crud-page";
import { PostsTable } from "@/components/tables/posts-table";
import { PostForm } from "@/components/forms/post-form";
import type { Post } from "@/types/post";

export default function PostsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/posts`
    : "";

  const { deleteFile } = useUpload({ basePath: collectionPath });
  const crud = useCrudPage<Post>({
    collectionPath,
    entityName: "post",
    onCleanupFiles: async (post) => {
      const urls = [post.imageUrl, post.authorAvatarUrl].filter(Boolean) as string[];
      await Promise.allSettled(urls.map((url) => deleteFile(url)));
    },
  });

  return (
    <CrudPage
      title="Posts"
      description="Manage event posts and announcements"
      addButtonLabel="Add Post"
      entityName="post"
      {...crud}
      renderTable={(posts, onEdit, onDelete) => (
        <PostsTable posts={posts} onEdit={onEdit} onDelete={onDelete} />
      )}
      renderForm={({ editingEntity, onSubmit, onCancel, submitStatus }) => (
        <PostForm
          defaultValues={editingEntity ? {
            imageUrl: editingEntity.imageUrl,
            description: editingEntity.description ?? null,
            authorName: editingEntity.authorName ?? null,
            authorAvatarUrl: editingEntity.authorAvatarUrl ?? null,
          } : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
          submitStatus={submitStatus}
          storagePath={collectionPath}
        />
      )}
    />
  );
}
