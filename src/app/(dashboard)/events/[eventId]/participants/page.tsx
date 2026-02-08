"use client";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { useUpload } from "@/hooks/use-upload";
import { CrudPage } from "@/components/crud-page";
import { ParticipantsTable } from "@/components/tables/participants-table";
import { ParticipantForm } from "@/components/forms/participant-form";
import type { Participant } from "@/types/participant";

export default function ParticipantsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/participants`
    : "";

  const { deleteFile } = useUpload({ basePath: collectionPath });
  const crud = useCrudPage<Participant>({
    collectionPath,
    orderByField: "lastName",
    orderDirection: "asc",
    entityName: "participant",
    onCleanupFiles: async (p) => {
      if (p.avatarUrl) await deleteFile(p.avatarUrl);
    },
  });

  return (
    <CrudPage
      title="Participants"
      description="Manage speakers, hosts, and representatives"
      addButtonLabel="Add Participant"
      entityName="participant"
      {...crud}
      renderTable={(participants, onEdit, onDelete) => (
        <ParticipantsTable
          participants={participants}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      renderForm={({ editingEntity, onSubmit, onCancel, submitStatus }) => (
        <ParticipantForm
          defaultValues={editingEntity ? {
            firstName: editingEntity.firstName,
            lastName: editingEntity.lastName,
            email: editingEntity.email ?? null,
            role: editingEntity.role,
            company: editingEntity.company ?? null,
            title: editingEntity.title ?? null,
            bio: editingEntity.bio ?? null,
            avatarUrl: editingEntity.avatarUrl ?? null,
            websiteUrl: editingEntity.websiteUrl ?? null,
            linkedinUrl: editingEntity.linkedinUrl ?? null,
            isHighlighted: editingEntity.isHighlighted,
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
