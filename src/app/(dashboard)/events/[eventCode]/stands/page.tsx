"use client";

import { toast } from "sonner";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useApiCrudPage } from "@/hooks/use-api-crud-page";
import { useTranslation } from "@/hooks/use-translation";
import { useUpload } from "@/hooks/use-upload";
import { apiFetch } from "@/lib/api-client";
import { CrudPage } from "@/components/crud-page";
import { BrandsTable } from "@/components/tables/brands-table";
import { BrandForm } from "@/components/forms/brand-form";
import type { Brand } from "@/types/brand";
import { useQueryClient } from "@tanstack/react-query";

export default function StandsPage({
  params,
}: {
  params: Promise<{ eventCode: string }>;
}) {
  const { eventCode } = useValidatedParams(params);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const apiPath = `/api/events/${eventCode}/brands`;
  const queryKey = ["events", eventCode, "brands"];

  const { deleteFile } = useUpload({ basePath: `events/${eventCode}/brands` });
  const crud = useApiCrudPage<Brand>({
    apiPath,
    queryKey,
    entityName: "stand",
    onCleanupFiles: async (brand) => {
      const urls = [brand.logoUrl, brand.imageUrl].filter(Boolean) as string[];
      await Promise.allSettled(urls.map((url) => deleteFile(url)));
    },
  });

  async function handleToggleHighlighted(brandId: string, isHighlighted: boolean) {
    try {
      await apiFetch(`${apiPath}/${brandId}`, {
        method: "PUT",
        body: { isHighlighted },
      });
      toast.success(isHighlighted ? t("brands.highlighted") : t("brands.unhighlighted"));
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error(t("brands.failedToUpdate"));
      console.error(err);
    }
  }

  return (
    <CrudPage
      title={t("brands.title")}
      description={t("brands.description")}
      addButtonLabel={t("brands.addButton")}
      entityName="stand"
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
          storagePath={`events/${eventCode}/brands`}
        />
      )}
    />
  );
}
