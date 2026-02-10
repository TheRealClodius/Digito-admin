"use client";

import { useCrudPage } from "@/hooks/use-crud-page";
import { deleteClientCascade } from "@/lib/firestore";
import { useUpload } from "@/hooks/use-upload";
import { usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/hooks/use-translation";
import { CrudPage } from "@/components/crud-page";
import { ClientsTable } from "@/components/tables/clients-table";
import { ClientForm } from "@/components/forms/client-form";
import type { Client } from "@/types/client";

export default function ClientsPage() {
  const { isSuperAdmin } = usePermissions();
  const { t } = useTranslation();
  const { deleteFile } = useUpload({ basePath: "clients" });
  const crud = useCrudPage<Client>({
    collectionPath: "clients",
    orderByField: "name",
    orderDirection: "asc",
    entityName: "client",
    onDelete: (id) => deleteClientCascade(id),
    onCleanupFiles: async (client) => {
      if (client.logoUrl) await deleteFile(client.logoUrl);
    },
  });

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("unauthorized.title")}</h1>
        <p className="text-muted-foreground">
          {t("unauthorized.description")}
        </p>
      </div>
    );
  }

  return (
    <CrudPage
      title={t("clients.title")}
      description={t("clients.description")}
      addButtonLabel={t("clients.addButton")}
      entityName="client"
      deleteDescription={t("clients.deleteConfirm")}
      readOnly={!isSuperAdmin}
      {...crud}
      renderTable={(clients, onEdit, onDelete) => (
        <ClientsTable clients={clients} onEdit={onEdit} onDelete={onDelete} />
      )}
      renderForm={({ editingEntity, onSubmit, onCancel, submitStatus }) => (
        <ClientForm
          defaultValues={editingEntity ? {
            name: editingEntity.name,
            description: editingEntity.description ?? null,
            logoUrl: editingEntity.logoUrl ?? null,
          } : undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
          submitStatus={submitStatus}
          storagePath="clients"
        />
      )}
    />
  );
}
