"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
import { ImageUpload } from "@/components/image-upload";
import { useUpload } from "@/hooks/use-upload";
import { brandSchema, type BrandFormValues } from "@/lib/schemas";
import { useTranslation } from "@/hooks/use-translation";

type SubmitStatus = "idle" | "saving" | "success" | "error";

interface BrandFormProps {
  defaultValues?: Partial<BrandFormValues>;
  onSubmit: (data: BrandFormValues) => void;
  onCancel: () => void;
  submitStatus?: SubmitStatus;
  storagePath?: string;
}

export function BrandForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitStatus = "idle",
  storagePath,
}: BrandFormProps) {
  const isSubmitting = submitStatus === "saving";
  const { upload, deleteFile } = useUpload({ basePath: storagePath ?? "" });
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? null,
      logoUrl: defaultValues?.logoUrl ?? null,
      imageUrl: defaultValues?.imageUrl ?? null,
      websiteUrl: defaultValues?.websiteUrl ?? "",
      instagramUrl: defaultValues?.instagramUrl ?? "",
      stallNumber: defaultValues?.stallNumber ?? null,
      isHighlighted: defaultValues?.isHighlighted ?? false,
    },
    mode: "onTouched",
  });

  const [nameValue, logoUrlValue, imageUrlValue, isHighlightedValue] = watch(["name", "logoUrl", "imageUrl", "isHighlighted"]);
  const isNameEmpty = !nameValue || nameValue.trim() === "";

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data))}
      className="grid grid-cols-2 gap-x-4 gap-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="name">{t("common.name")}</Label>
        <Input
          id="name"
          {...register("name")}
          aria-required="true"
          required
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="stallNumber">{t("brands.stallNumber")}</Label>
        <Input id="stallNumber" {...register("stallNumber")} />
      </div>

      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <WysiwygEditor
            className="col-span-2"
            label={t("common.description")}
            fieldName="description"
            id="description"
            value={field.value ?? ""}
            onChange={field.onChange}
            getCurrentValue={() => watch("description") ?? ""}
            onAccept={(text) => setValue("description", text, { shouldDirty: true })}
          />
        )}
      />

      <div className="space-y-2">
        <Label htmlFor="websiteUrl">{t("common.websiteUrl")}</Label>
        <Input id="websiteUrl" {...register("websiteUrl")} type="url" />
        {errors.websiteUrl && (
          <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagramUrl">{t("common.instagramUrl")}</Label>
        <Input id="instagramUrl" {...register("instagramUrl")} type="url" />
        {errors.instagramUrl && (
          <p className="text-sm text-destructive">{errors.instagramUrl.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("common.logo")}</Label>
        <ImageUpload
          value={logoUrlValue || null}
          onChange={(url) => setValue("logoUrl", url)}
          uploadFn={storagePath ? (file) => upload(file, `logo_${Date.now()}_${file.name}`) : undefined}
          deleteFileFn={deleteFile}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("common.image")}</Label>
        <ImageUpload
          value={imageUrlValue || null}
          onChange={(url) => setValue("imageUrl", url)}
          uploadFn={storagePath ? (file) => upload(file, `image_${Date.now()}_${file.name}`) : undefined}
          deleteFileFn={deleteFile}
          disabled={isSubmitting}
        />
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <Switch
          id="isHighlighted"
          checked={isHighlightedValue ?? false}
          onCheckedChange={(checked) =>
            setValue("isHighlighted", checked as boolean)
          }
        />
        <Label htmlFor="isHighlighted">{t("common.highlighted")}</Label>
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <Button type="submit" disabled={isNameEmpty || isSubmitting}>
          {isSubmitting ? t("common.saving") : t("common.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t("common.cancel")}
        </Button>
        {submitStatus === "success" && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="size-4" />
            {t("common.saved")}
          </span>
        )}
        {submitStatus === "error" && (
          <p className="text-sm text-destructive">{t("common.failedToSave")}</p>
        )}
      </div>
    </form>
  );
}
