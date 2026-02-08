"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { batchUpdateWhitelistAndUser } from "@/lib/firestore";
import { CrudPage } from "@/components/crud-page";
import { WhitelistTable } from "@/components/tables/whitelist-table";
import { WhitelistForm } from "@/components/forms/whitelist-form";
import type { WhitelistEntry } from "@/types/whitelist-entry";

export default function WhitelistPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/whitelist`
    : "";

  const crud = useCrudPage<WhitelistEntry>({
    collectionPath,
    orderByField: "addedAt",
    orderDirection: "desc",
    entityName: "whitelist entry",
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
      toast.error("Failed to save whitelist entry");
      console.error(err);
    }
  }

  return (
    <CrudPage
      title="Whitelist"
      description="Manage pre-approved attendees"
      addButtonLabel="Add Entry"
      entityName="whitelist entry"
      deleteTitle="Remove Entry"
      deleteDescription="Remove this person from the whitelist?"
      deleteActionLabel="Remove"
      newDescription="Add a new pre-approved attendee."
      {...crud}
      submitStatus={submitStatus}
      handleSubmit={handleSubmit}
      renderTable={(entries, onEdit, onDelete) => (
        <WhitelistTable entries={entries} onEdit={onEdit} onDelete={onDelete} />
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
