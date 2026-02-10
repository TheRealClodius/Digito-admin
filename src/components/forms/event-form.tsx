"use client";

import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AICopyTools } from "@/components/ai-copy-tools";
import { ImageUpload } from "@/components/image-upload";
import { useUpload } from "@/hooks/use-upload";
import { useTranslation } from "@/hooks/use-translation";

type SubmitStatus = "idle" | "saving" | "success" | "error";

interface EventFormDefaultValues {
  name?: string | null;
  description?: string | null;
  venue?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  chatPrompt?: string | null;
  imageUrls?: string[];
  isActive?: boolean;
  logoUrl?: string | null;
  bannerUrl?: string | null;
}

interface EventFormProps {
  clientId: string;
  defaultValues?: EventFormDefaultValues;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  submitStatus?: SubmitStatus;
  storagePath?: string;
}

function formatDateForInput(date: Date | null | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface FormValues {
  name: string;
  description: string;
  venue: string;
  startDate: string;
  endDate: string;
  websiteUrl: string;
  instagramUrl: string;
  chatPrompt: string;
  isActive: boolean;
  logoUrl: string;
  bannerUrl: string;
}

export function EventForm({
  clientId,
  defaultValues,
  onSubmit,
  onCancel,
  submitStatus = "idle",
  storagePath,
}: EventFormProps) {
  const isSubmitting = submitStatus === "saving";
  const { upload, deleteFile } = useUpload({ basePath: storagePath ?? "" });
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      venue: defaultValues?.venue ?? "",
      startDate: formatDateForInput(defaultValues?.startDate),
      endDate: formatDateForInput(defaultValues?.endDate),
      websiteUrl: defaultValues?.websiteUrl ?? "",
      instagramUrl: defaultValues?.instagramUrl ?? "",
      chatPrompt: defaultValues?.chatPrompt ?? "",
      isActive: defaultValues?.isActive ?? true,
      logoUrl: defaultValues?.logoUrl ?? "",
      bannerUrl: defaultValues?.bannerUrl ?? "",
    },
    mode: "onBlur",
  });

  const [nameValue, isActiveValue, logoUrlValue, bannerUrlValue] = watch(["name", "isActive", "logoUrl", "bannerUrl"]);

  const isSubmitDisabled = !nameValue?.trim() || isSubmitting;

  const onFormSubmit = (data: FormValues) => {
    onSubmit({
      clientId,
      ...data,
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="grid grid-cols-2 gap-x-4 gap-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">{t("common.name")}</Label>
        <Input
          id="name"
          aria-label="Name"
          {...register("name", { required: t("validation.nameRequired") })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue">{t("events.venue")}</Label>
        <Input
          id="venue"
          aria-label="Venue"
          {...register("venue")}
        />
      </div>

      <div className="col-span-2 space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">{t("common.description")}</Label>
          <AICopyTools
            fieldName="description"
            getCurrentValue={() => watch("description") ?? ""}
            onAccept={(text) => setValue("description", text, { shouldDirty: true })}
          />
        </div>
        <Textarea
          id="description"
          aria-label="Description"
          {...register("description")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDate">{t("events.startDate")}</Label>
        <input
          type="datetime-local"
          id="startDate"
          aria-label="Start Date"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("startDate", { required: t("validation.startDateRequired") })}
        />
        {errors.startDate && (
          <p className="text-sm text-destructive">{errors.startDate.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="endDate">{t("events.endDate")}</Label>
        <input
          type="datetime-local"
          id="endDate"
          aria-label="End Date"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("endDate", { required: t("validation.endDateRequired") })}
        />
        {errors.endDate && (
          <p className="text-sm text-destructive">{errors.endDate.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="websiteUrl">{t("common.websiteUrl")}</Label>
        <Input
          id="websiteUrl"
          aria-label="Website URL"
          {...register("websiteUrl")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagramUrl">{t("common.instagramUrl")}</Label>
        <Input
          id="instagramUrl"
          aria-label="Instagram URL"
          {...register("instagramUrl")}
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label htmlFor="chatPrompt">{t("events.chatPrompt")}</Label>
        <Input
          id="chatPrompt"
          aria-label="Chat Prompt"
          placeholder={t("events.chatPromptPlaceholder")}
          {...register("chatPrompt")}
        />
      </div>

      <div className="col-span-2 flex items-center space-x-2">
        <input
          type="checkbox"
          role="switch"
          id="isActive"
          aria-label="Active"
          checked={isActiveValue}
          onChange={(e) => setValue("isActive", e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="isActive">{t("common.active")}</Label>
      </div>

      <div className="space-y-2">
        <Label>{t("common.logo")}</Label>
        <ImageUpload
          value={logoUrlValue || null}
          onChange={(url) => setValue("logoUrl", url ?? "")}
          uploadFn={storagePath ? (file) => upload(file, `logo_${Date.now()}_${file.name}`) : undefined}
          deleteFileFn={deleteFile}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("events.banner")}</Label>
        <ImageUpload
          value={bannerUrlValue || null}
          onChange={(url) => setValue("bannerUrl", url ?? "")}
          uploadFn={storagePath ? (file) => upload(file, `banner_${Date.now()}_${file.name}`) : undefined}
          deleteFileFn={deleteFile}
          disabled={isSubmitting}
        />
      </div>

      <div className="col-span-2 flex items-center gap-4">
        <Button type="submit" disabled={isSubmitDisabled}>
          {isSubmitting ? t("common.saving") : t("common.save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
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
