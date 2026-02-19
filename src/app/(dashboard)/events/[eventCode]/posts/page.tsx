"use client";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useApiCrudPage } from "@/hooks/use-api-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { useTranslation } from "@/hooks/use-translation";
import { useUpload } from "@/hooks/use-upload";
import { useApiDocument } from "@/hooks/use-api-document";
import { CrudPage } from "@/components/crud-page";
import { PostsTable } from "@/components/tables/posts-table";
import { PostForm } from "@/components/forms/post-form";
import type { Post } from "@/types/post";
import type { Event } from "@/types/event";

export default function PostsPage({
  params,
}: {
  params: Promise<{ eventCode: string }>;
}) {
  const { eventCode } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const { t } = useTranslation();
  const apiPath = `/api/events/${eventCode}/posts`;

  // Fetch event data to get the logo
  const { data: event } = useApiDocument<Event>({
    apiPath: selectedClientId ? `/api/clients/${selectedClientId}/events/${eventCode}` : "",
    queryKey: ["clients", selectedClientId ?? "", "events", eventCode],
    enabled: !!selectedClientId,
  });

  const { deleteFile } = useUpload({ basePath: `events/${eventCode}/posts` });
  const crud = useApiCrudPage<Post>({
    apiPath,
    queryKey: ["events", eventCode, "posts"],
    entityName: "post",
    onCleanupFiles: async (post) => {
      if (post.imageUrl) {
        await deleteFile(post.imageUrl);
      }
    },
  });

  return (
    <CrudPage
      title={t("posts.title")}
      description={t("posts.description")}
      addButtonLabel={t("posts.addButton")}
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
          eventLogoUrl={event?.logoUrl ?? null}
          onSubmit={onSubmit}
          onCancel={onCancel}
          submitStatus={submitStatus}
          storagePath={`events/${eventCode}/posts`}
        />
      )}
    />
  );
}
