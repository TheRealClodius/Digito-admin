"use client";

import { Timestamp } from "firebase/firestore";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { toDate } from "@/lib/timestamps";
import { CrudPage } from "@/components/crud-page";
import { SessionsTable } from "@/components/tables/sessions-table";
import { SessionForm } from "@/components/forms/session-form";
import type { Session } from "@/types/session";

export default function SessionsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/sessions`
    : "";

  const crud = useCrudPage<Session>({
    collectionPath,
    orderByField: "startTime",
    orderDirection: "asc",
    entityName: "session",
    dataTransformer: (data) => ({
      ...data,
      startTime: data.startTime instanceof Date ? Timestamp.fromDate(data.startTime) : data.startTime,
      endTime: data.endTime instanceof Date ? Timestamp.fromDate(data.endTime) : data.endTime,
    }),
  });

  return (
    <CrudPage
      title="Sessions"
      description="Manage talks, workshops, and panels"
      addButtonLabel="Add Session"
      entityName="session"
      {...crud}
      renderTable={(sessions, onEdit, onDelete) => (
        <SessionsTable sessions={sessions} onEdit={onEdit} onDelete={onDelete} />
      )}
      renderForm={({ editingEntity, onSubmit, onCancel, submitStatus }) => (
        <SessionForm
          defaultValues={editingEntity ? {
            title: editingEntity.title,
            description: editingEntity.description ?? null,
            startTime: toDate(editingEntity.startTime),
            endTime: toDate(editingEntity.endTime),
            location: editingEntity.location ?? null,
            type: editingEntity.type,
            speakerName: editingEntity.speakerName ?? null,
            speakerBio: editingEntity.speakerBio ?? null,
            requiresAccess: editingEntity.requiresAccess,
            accessTier: editingEntity.accessTier ?? null,
          } : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
          submitStatus={submitStatus}
        />
      )}
    />
  );
}
