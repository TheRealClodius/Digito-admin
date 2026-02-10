"use client";

import { toast } from "sonner";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { useTranslation } from "@/hooks/use-translation";
import { updateDocument } from "@/lib/firestore";
import { useUpload } from "@/hooks/use-upload";
import { CrudPage } from "@/components/crud-page";
import { BrandsTable } from "@/components/tables/brands-table";
import { BrandForm } from "@/components/forms/brand-form";
import { NoClientSelected } from "@/components/no-client-selected";
import type { Brand } from "@/types/brand";

export default function BrandsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const { t } = useTranslation();
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
      toast.success(isHighlighted ? t("brands.highlighted") : t("brands.unhighlighted"));
    } catch (err) {
      toast.error(t("brands.failedToUpdate"));
      console.error(err);
    }
  }

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("brands.title")}</h1>
          <p className="text-muted-foreground">{t("brands.description")}</p>
        </div>
        <NoClientSelected />
      </div>
    );
  }

  return (
    <CrudPage
      title={t("brands.title")}
      description={t("brands.description")}
      addButtonLabel={t("brands.addButton")}
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
