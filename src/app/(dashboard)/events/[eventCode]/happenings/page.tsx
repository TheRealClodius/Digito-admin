"use client";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useApiCrudPage } from "@/hooks/use-api-crud-page";
import { useTranslation } from "@/hooks/use-translation";
import { toDate } from "@/lib/timestamps";
import { CrudPage } from "@/components/crud-page";
import { HappeningsTable } from "@/components/tables/happenings-table";
import { HappeningForm } from "@/components/forms/happening-form";
import type { Happening } from "@/types/happening";

export default function HappeningsPage({
  params,
}: {
  params: Promise<{ eventCode: string }>;
}) {
  const { eventCode } = useValidatedParams(params);
  const { t } = useTranslation();

  const crud = useApiCrudPage<Happening>({
    apiPath: `/api/events/${eventCode}/happenings`,
    queryKey: ["events", eventCode, "happenings"],
    entityName: "happening",
  });

  return (
    <CrudPage
      title={t("happenings.title")}
      description={t("happenings.description")}
      addButtonLabel={t("happenings.addButton")}
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
