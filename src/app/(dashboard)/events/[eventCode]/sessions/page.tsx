"use client";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useApiCrudPage } from "@/hooks/use-api-crud-page";
import { useTranslation } from "@/hooks/use-translation";
import { toDate } from "@/lib/timestamps";
import { CrudPage } from "@/components/crud-page";
import { SessionsTable } from "@/components/tables/sessions-table";
import { SessionForm } from "@/components/forms/session-form";
import type { Session } from "@/types/session";

export default function SessionsPage({
  params,
}: {
  params: Promise<{ eventCode: string }>;
}) {
  const { eventCode } = useValidatedParams(params);
  const { t } = useTranslation();

  const crud = useApiCrudPage<Session>({
    apiPath: `/api/events/${eventCode}/sessions`,
    queryKey: ["events", eventCode, "sessions"],
    entityName: "session",
  });

  return (
    <CrudPage
      title={t("sessions.title")}
      description={t("sessions.description")}
      addButtonLabel={t("sessions.addButton")}
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
            accessTier: editingEntity.accessTier as "regular" | "premium" | "vip" | "staff" | null | undefined,
          } : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
          submitStatus={submitStatus}
        />
      )}
    />
  );
}
