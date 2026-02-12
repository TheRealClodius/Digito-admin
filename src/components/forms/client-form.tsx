"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
import { ImageUpload } from "@/components/image-upload";
import { useUpload } from "@/hooks/use-upload";
import { clientSchema, type ClientFormValues } from "@/lib/schemas";
import { useTranslation } from "@/hooks/use-translation";

type SubmitStatus = "idle" | "saving" | "success" | "error";

interface ClientFormProps {
  defaultValues?: {
    name?: string;
    description?: string | null;
    logoUrl?: string | null;
  };
  onSubmit: (data: ClientFormValues) => void;
  onCancel: () => void;
  submitStatus?: SubmitStatus;
  storagePath?: string;
}

export function ClientForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitStatus = "idle",
  storagePath,
}: ClientFormProps) {
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
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      logoUrl: defaultValues?.logoUrl ?? "",
    },
    mode: "onTouched",
  });

  const [nameValue, logoUrlValue] = watch(["name", "logoUrl"]);
  const isNameEmpty = !nameValue || nameValue.trim() === "";

  const handleFormSubmit = (data: ClientFormValues) => {
    if (defaultValues?.logoUrl && defaultValues.logoUrl !== data.logoUrl) {
      deleteFile(defaultValues.logoUrl);
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-2 gap-x-4 gap-y-6">
      <div className="col-span-2 space-y-3">
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

      <div className="col-span-2 space-y-3">
        <Label>{t("common.logo")}</Label>
        <ImageUpload
          value={logoUrlValue || null}
          onChange={(url) => setValue("logoUrl", url)}
          uploadFn={storagePath ? (file) => upload(file, `logo_${Date.now()}_${file.name}`) : undefined}
          deleteFileFn={storagePath ? deleteFile : undefined}
          onError={() => toast.error(t("common.uploadFailed"))}
          disabled={isSubmitting}
        />
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <Button
          type="submit"
          disabled={isNameEmpty || isSubmitting}
        >
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
