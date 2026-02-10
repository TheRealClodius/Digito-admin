"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addDocument, updateDocument, deleteDocument } from "@/lib/firestore";
import { useCollection } from "@/hooks/use-collection";
import { useTranslation } from "@/hooks/use-translation";
import type { DocumentData, QueryConstraint } from "firebase/firestore";

type SubmitStatus = "idle" | "saving" | "success" | "error";

interface UseCrudPageOptions<T> {
  collectionPath: string;
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  constraints?: QueryConstraint[];
  constraintsKey?: string;
  pageSize?: number;
  entityName?: string;
  dataTransformer?: (data: Record<string, unknown>) => Record<string, unknown>;
  onDelete?: (id: string) => Promise<void>;
  onCleanupFiles?: (entity: T) => Promise<void>;
}

export function useCrudPage<T extends DocumentData & { id: string }>({
  collectionPath,
  orderByField = "createdAt",
  orderDirection = "desc",
  constraints = [],
  constraintsKey,
  pageSize,
  entityName = "item",
  dataTransformer,
  onDelete,
  onCleanupFiles,
}: UseCrudPageOptions<T>) {
  const { t } = useTranslation();
  const { data, loading, error } = useCollection<T>({
    path: collectionPath,
    orderByField,
    orderDirection,
    constraints,
    constraintsKey,
    pageSize,
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

  async function handleSubmit(data: Record<string, unknown>) {
    if (!collectionPath) return;

    const transformedData = dataTransformer ? dataTransformer(data) : data;

    setSubmitStatus("saving");
    try {
      if (editingEntity) {
        await updateDocument(collectionPath, editingEntity.id, transformedData);
      } else {
        await addDocument(collectionPath, transformedData);
      }
      setSubmitStatus("success");
    } catch (err) {
      setSubmitStatus("error");
      toast.error(t("crud.failedToSave", { entity: entityName }));
      console.error(err);
    }
  }

  async function handleDelete() {
    if (!deletingEntityId || !collectionPath) return;
    try {
      // Best-effort cleanup of associated Storage files
      if (onCleanupFiles) {
        const entity = data.find((e) => e.id === deletingEntityId);
        if (entity) {
          await onCleanupFiles(entity).catch(() => {});
        }
      }

      if (onDelete) {
        await onDelete(deletingEntityId);
      } else {
        await deleteDocument(collectionPath, deletingEntityId);
      }
      toast.success(t("crud.entityDeleted", { entity: entityName }));
    } catch (err) {
      toast.error(t("crud.failedToDelete", { entity: entityName }));
      console.error(err);
    } finally {
      setDeletingEntityId(null);
    }
  }

  return {
    // Data from useCollection
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
