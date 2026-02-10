"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { useTranslation } from "@/hooks/use-translation";
import { useCollection } from "@/hooks/use-collection";
import { batchUpdateWhitelistAndUser } from "@/lib/firestore";
import { CrudPage } from "@/components/crud-page";
import { WhitelistTable, type EventUser } from "@/components/tables/whitelist-table";
import { WhitelistForm } from "@/components/forms/whitelist-form";
import { NoClientSelected } from "@/components/no-client-selected";
import type { WhitelistEntry } from "@/types/whitelist-entry";

export default function WhitelistPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const { t } = useTranslation();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/whitelist`
    : "";
  const usersPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/users`
    : "";

  const crud = useCrudPage<WhitelistEntry>({
    collectionPath,
    orderByField: "addedAt",
    orderDirection: "desc",
    entityName: "whitelist entry",
  });

  const { data: users } = useCollection<EventUser>({
    path: usersPath,
    orderByField: "email",
    orderDirection: "asc",
  });

  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  async function handleSubmit(data: Record<string, unknown>) {
    if (!collectionPath || !selectedClientId) return;
    setSubmitStatus("saving");
    try {
      const lockedFields = (data.lockedFields as string[] | undefined) ?? [];

      await batchUpdateWhitelistAndUser({
        whitelistPath: collectionPath,
        whitelistId: crud.editingEntity?.id ?? null,
        whitelistData: data,
        usersPath: `clients/${selectedClientId}/events/${eventId}/users`,
        email: data.email as string,
        lockedFields,
      });

      setSubmitStatus("success");
    } catch (err) {
      setSubmitStatus("error");
      toast.error(t("whitelist.failedToSave"));
      console.error(err);
    }
  }

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("whitelist.title")}</h1>
          <p className="text-muted-foreground">{t("whitelist.description")}</p>
        </div>
        <NoClientSelected />
      </div>
    );
  }

  return (
    <CrudPage
      title={t("whitelist.title")}
      description={t("whitelist.description")}
      addButtonLabel={t("whitelist.addButton")}
      entityName="whitelist entry"
      deleteTitle={t("whitelist.removeTitle")}
      deleteDescription={t("whitelist.removeConfirm")}
      deleteActionLabel={t("whitelist.removeAction")}
      newDescription={t("whitelist.newDescription")}
      {...crud}
      submitStatus={submitStatus}
      handleSubmit={handleSubmit}
      renderTable={(entries, onEdit, onDelete) => (
        <WhitelistTable
          entries={entries}
          users={users}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      renderForm={({ editingEntity, onSubmit, onCancel, submitStatus: status }) => (
        <WhitelistForm
          defaultValues={editingEntity ? {
            email: editingEntity.email,
            accessTier: editingEntity.accessTier,
            company: editingEntity.company ?? null,
            lockedFields: editingEntity.lockedFields ?? [],
          } : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
          submitStatus={status}
        />
      )}
    />
  );
}
