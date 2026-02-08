"use client";

import { useCrudPage } from "@/hooks/use-crud-page";
import { deleteClientCascade } from "@/lib/firestore";
import { useUpload } from "@/hooks/use-upload";
import { CrudPage } from "@/components/crud-page";
import { ClientsTable } from "@/components/tables/clients-table";
import { ClientForm } from "@/components/forms/client-form";
import type { Client } from "@/types/client";

export default function ClientsPage() {
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

  return (
    <CrudPage
      title="Clients"
      description="Manage your client organizations"
      addButtonLabel="New Client"
      entityName="client"
      deleteDescription="Are you sure you want to delete this client? This action cannot be undone and will also remove all events under this client."
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
