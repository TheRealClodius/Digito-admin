"use client";

import { Timestamp } from "firebase/firestore";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { toDate } from "@/lib/timestamps";
import { CrudPage } from "@/components/crud-page";
import { HappeningsTable } from "@/components/tables/happenings-table";
import { HappeningForm } from "@/components/forms/happening-form";
import { NoClientSelected } from "@/components/no-client-selected";
import type { Happening } from "@/types/happening";

const toTimestamp = (val: unknown): Timestamp | unknown => {
  if (val instanceof Date) return Timestamp.fromDate(val);
  if (typeof val === "string" && val) return Timestamp.fromDate(new Date(val));
  return val;
};

export default function HappeningsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/happenings`
    : "";

  const crud = useCrudPage<Happening>({
    collectionPath,
    orderByField: "startTime",
    orderDirection: "asc",
    entityName: "happening",
    dataTransformer: (data) => ({
      ...data,
      startTime: toTimestamp(data.startTime),
      endTime: toTimestamp(data.endTime),
    }),
  });

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eventi</h1> {/* Events/Happenings */}
          <p className="text-muted-foreground">Gestisci demo, performance e attivazioni</p> {/* Manage demos, performances, and activations */}
        </div>
        <NoClientSelected />
      </div>
    );
  }

  return (
    <CrudPage
      title="Eventi"
      description="Gestisci demo, performance e attivazioni"
      addButtonLabel="Add Happening"
      entityName="happening"
      {...crud}
      renderTable={(happenings, onEdit, onDelete) => (
        <HappeningsTable happenings={happenings} onEdit={onEdit} onDelete={onDelete} />
      )}
      renderForm={({ editingEntity, onSubmit, onCancel, submitStatus }) => (
        <HappeningForm
          defaultValues={editingEntity ? {
            title: editingEntity.title,
            description: editingEntity.description ?? null,
            startTime: toDate(editingEntity.startTime),
            endTime: toDate(editingEntity.endTime),
            location: editingEntity.location ?? null,
            type: editingEntity.type,
            hostName: editingEntity.hostName ?? null,
            isHighlighted: editingEntity.isHighlighted,
            requiresAccess: editingEntity.requiresAccess,
          } : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
          submitStatus={submitStatus}
        />
      )}
    />
  );
}
