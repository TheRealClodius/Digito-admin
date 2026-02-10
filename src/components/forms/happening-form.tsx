"use client";

import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownTextarea } from "@/components/markdown-textarea";
import type { HappeningType } from "@/types/happening";
import { useTranslation } from "@/hooks/use-translation";

type SubmitStatus = "idle" | "saving" | "success" | "error";

interface HappeningFormDefaultValues {
  title?: string | null;
  description?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  location?: string | null;
  type?: HappeningType | null;
  hostName?: string | null;
  isHighlighted?: boolean;
  requiresAccess?: boolean;
}

interface HappeningFormProps {
  defaultValues?: HappeningFormDefaultValues;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  submitStatus?: SubmitStatus;
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

const HAPPENING_TYPES: HappeningType[] = [
  "demo",
  "performance",
  "launch",
  "networking",
  "reception",
  "other",
];

interface FormValues {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  type: HappeningType;
  hostName: string;
  isHighlighted: boolean;
  requiresAccess: boolean;
}

export function HappeningForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitStatus = "idle",
}: HappeningFormProps) {
  const isSubmitting = submitStatus === "saving";
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      startTime: formatDateForInput(defaultValues?.startTime),
      endTime: formatDateForInput(defaultValues?.endTime),
      location: defaultValues?.location ?? "",
      type: defaultValues?.type ?? "other",
      hostName: defaultValues?.hostName ?? "",
      isHighlighted: defaultValues?.isHighlighted ?? false,
      requiresAccess: defaultValues?.requiresAccess ?? false,
    },
    mode: "onBlur",
  });

  const [titleValue, isHighlightedValue, requiresAccessValue] = watch(["title", "isHighlighted", "requiresAccess"]);

  const isSubmitDisabled = !titleValue?.trim() || isSubmitting;

  const onFormSubmit = (data: FormValues) => {
    onSubmit({ ...data });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="grid grid-cols-2 gap-x-4 gap-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">{t("common.title")}</Label>
        <Input
          id="title"
          aria-label="Title"
          {...register("title", { required: t("validation.titleRequired") })}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">{t("common.type")}</Label>
        <select
          id="type"
          aria-label="Type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("type")}
        >
          {HAPPENING_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <MarkdownTextarea
        className="col-span-2"
        label={t("common.description")}
        fieldName="description"
        id="description"
        ariaLabel="Description"
        getCurrentValue={() => watch("description") ?? ""}
        onAccept={(text) => setValue("description", text, { shouldDirty: true })}
        textareaProps={register("description")}
        showPreview={true}
      />

      <div className="space-y-2">
        <Label htmlFor="startTime">{t("happenings.startTime")}</Label>
        <input
          type="datetime-local"
          id="startTime"
          aria-label="Start Time"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("startTime")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endTime">{t("happenings.endTime")}</Label>
        <input
          type="datetime-local"
          id="endTime"
          aria-label="End Time"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("endTime")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">{t("common.location")}</Label>
        <Input
          id="location"
          aria-label="Location"
          {...register("location")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hostName">{t("happenings.hostName")}</Label>
        <Input
          id="hostName"
          aria-label="Host Name"
          {...register("hostName")}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          role="switch"
          id="isHighlighted"
          aria-label="Highlighted"
          checked={isHighlightedValue}
          onChange={(e) => setValue("isHighlighted", e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="isHighlighted">{t("common.highlighted")}</Label>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          role="switch"
          id="requiresAccess"
          aria-label="Requires Access"
          checked={requiresAccessValue}
          onChange={(e) => setValue("requiresAccess", e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="requiresAccess">{t("common.requiresAccess")}</Label>
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
