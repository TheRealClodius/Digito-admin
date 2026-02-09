"use client";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { useUpload } from "@/hooks/use-upload";
import { CrudPage } from "@/components/crud-page";
import { ParticipantsTable } from "@/components/tables/participants-table";
import { ParticipantForm } from "@/components/forms/participant-form";
import { NoClientSelected } from "@/components/no-client-selected";
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

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partecipanti</h1> {/* Participants */}
          <p className="text-muted-foreground">Gestisci relatori, host e rappresentanti</p> {/* Manage speakers, hosts, and representatives */}
        </div>
        <NoClientSelected />
      </div>
    );
  }

  return (
    <CrudPage
      title="Partecipanti"
      description="Gestisci relatori, host e rappresentanti"
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
