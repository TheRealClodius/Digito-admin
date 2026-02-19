"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useApiCollection } from "@/hooks/use-api-collection";
import { useTranslation } from "@/hooks/use-translation";

type SubmitStatus = "idle" | "saving" | "success" | "error";

interface UseApiCrudPageOptions<T> {
  /** API route path, e.g. "/api/clients" or "/api/events/2025089/brands" */
  apiPath: string;
  /** React Query cache key, e.g. ["clients"] or ["events", "2025089", "brands"] */
  queryKey: string[];
  /** Display name for toast messages */
  entityName?: string;
  /** Custom delete handler (overrides default DELETE call) */
  onDelete?: (id: string) => Promise<void>;
  /** Pre-delete cleanup (e.g. delete associated Storage files) */
  onCleanupFiles?: (entity: T) => Promise<void>;
}

/**
 * API-based CRUD hook — drop-in replacement for the Firestore-based `useCrudPage`.
 *
 * Features:
 * - Reads via `useApiCollection` (React Query)
 * - Creates via POST, updates via PUT, deletes via DELETE
 * - Optimistic updates for immediate UI feedback
 * - Automatic rollback on mutation failure
 * - Cache invalidation after mutations
 */
export function useApiCrudPage<T extends { id: string }>({
  apiPath,
  queryKey,
  entityName = "item",
  onDelete,
  onCleanupFiles,
}: UseApiCrudPageOptions<T>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, loading, error } = useApiCollection<T>({
    apiPath,
    queryKey,
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<T | null>(null);
  const [deletingEntityId, setDeletingEntityId] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");

  function handleNew() {
    setEditingEntity(null);
    setSubmitStatus("idle");
    setSheetOpen(true);
  }

  function handleEdit(entity: T) {
    setEditingEntity(entity);
    setSubmitStatus("idle");
    setSheetOpen(true);
  }

  async function handleSubmit(formData: Record<string, unknown>) {
    if (!apiPath) return;

    setSubmitStatus("saving");

    // Snapshot previous data for rollback
    const previousData = queryClient.getQueryData<T[]>(queryKey);

    try {
      if (editingEntity) {
        // Optimistic update: merge form data into the existing entity in cache
        queryClient.setQueryData<T[]>(queryKey, (old) =>
          (old ?? []).map((item) =>
            item.id === editingEntity.id
              ? { ...item, ...formData } as T
              : item
          )
        );

        await apiFetch(`${apiPath}/${editingEntity.id}`, {
          method: "PUT",
          body: formData,
        });
      } else {
        await apiFetch(apiPath, {
          method: "POST",
          body: formData,
        });
      }
      setSubmitStatus("success");
      // Refetch to get server-authoritative data (with generated id, timestamps, etc.)
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      setSubmitStatus("error");
      // Rollback optimistic update
      if (previousData !== undefined) {
        queryClient.setQueryData(queryKey, previousData);
      }
      toast.error(t("crud.failedToSave", { entity: entityName }));
      console.error(err);
    }
  }

  async function handleDelete() {
    if (!deletingEntityId || !apiPath) return;

    // Snapshot previous data for rollback
    const previousData = queryClient.getQueryData<T[]>(queryKey);

    // Optimistic delete: remove item from cache immediately
    queryClient.setQueryData<T[]>(queryKey, (old) =>
      (old ?? []).filter((item) => item.id !== deletingEntityId)
    );

    try {
      // Best-effort cleanup of associated Storage files
      if (onCleanupFiles) {
        const entity = previousData?.find((e) => e.id === deletingEntityId);
        if (entity) {
          await onCleanupFiles(entity).catch(() => {});
        }
      }

      if (onDelete) {
        await onDelete(deletingEntityId);
      } else {
        await apiFetch(`${apiPath}/${deletingEntityId}`, {
          method: "DELETE",
        });
      }
      toast.success(t("crud.entityDeleted", { entity: entityName }));
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      // Rollback optimistic delete
      if (previousData !== undefined) {
        queryClient.setQueryData(queryKey, previousData);
      }
      toast.error(t("crud.failedToDelete", { entity: entityName }));
      console.error(err);
    } finally {
      setDeletingEntityId(null);
    }
  }

  return {
    // Data
    data,
    loading,
    error,

    // State
    sheetOpen,
    setSheetOpen,
    editingEntity,
    deletingEntityId,
    setDeletingEntityId,
    submitStatus,

    // Handlers
    handleNew,
    handleEdit,
    handleSubmit,
    handleDelete,
  };
}
