"use client";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useApiCrudPage } from "@/hooks/use-api-crud-page";
import { useTranslation } from "@/hooks/use-translation";
import { useApiCollection } from "@/hooks/use-api-collection";
import { CrudPage } from "@/components/crud-page";
import { WhitelistTable, type EventUser } from "@/components/tables/whitelist-table";
import { WhitelistForm } from "@/components/forms/whitelist-form";
import type { WhitelistEntry } from "@/types/whitelist-entry";

export default function WhitelistPage({
  params,
}: {
  params: Promise<{ eventCode: string }>;
}) {
  const { eventCode } = useValidatedParams(params);
  const { t } = useTranslation();
  const apiPath = `/api/events/${eventCode}/whitelist`;
  const queryKey = ["events", eventCode, "whitelist"];

  const crud = useApiCrudPage<WhitelistEntry>({
    apiPath,
    queryKey,
    entityName: "whitelist entry",
  });

  const { data: users } = useApiCollection<EventUser>({
    apiPath: `/api/events/${eventCode}/users`,
    queryKey: ["events", eventCode, "users"],
  });

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
