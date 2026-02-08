"use client";

import { toast } from "sonner";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { updateDocument } from "@/lib/firestore";
import { useUpload } from "@/hooks/use-upload";
import { CrudPage } from "@/components/crud-page";
import { BrandsTable } from "@/components/tables/brands-table";
import { BrandForm } from "@/components/forms/brand-form";
import type { Brand } from "@/types/brand";

export default function BrandsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/brands`
    : "";

  const { deleteFile } = useUpload({ basePath: collectionPath });
  const crud = useCrudPage<Brand>({
    collectionPath,
    orderByField: "name",
    orderDirection: "asc",
    entityName: "brand",
    onCleanupFiles: async (brand) => {
      const urls = [brand.logoUrl, brand.imageUrl].filter(Boolean) as string[];
      await Promise.allSettled(urls.map((url) => deleteFile(url)));
    },
  });

  async function handleToggleHighlighted(brandId: string, isHighlighted: boolean) {
    if (!collectionPath) return;
    try {
      await updateDocument(collectionPath, brandId, { isHighlighted });
      toast.success(isHighlighted ? "Brand highlighted" : "Brand unhighlighted");
    } catch (err) {
      toast.error("Failed to update brand");
      console.error(err);
    }
  }

  return (
    <CrudPage
      title="Brands"
      description="Manage brands for this event"
      addButtonLabel="Add Brand"
      entityName="brand"
      {...crud}
      renderTable={(brands, onEdit, onDelete) => (
        <BrandsTable
          brands={brands}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleHighlighted={handleToggleHighlighted}
        />
      )}
      renderForm={({ editingEntity, onSubmit, onCancel, submitStatus }) => (
        <BrandForm
          defaultValues={editingEntity ? {
            name: editingEntity.name,
            description: editingEntity.description ?? null,
            logoUrl: editingEntity.logoUrl ?? null,
            imageUrl: editingEntity.imageUrl ?? null,
            websiteUrl: editingEntity.websiteUrl ?? null,
            instagramUrl: editingEntity.instagramUrl ?? null,
            stallNumber: editingEntity.stallNumber ?? null,
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
