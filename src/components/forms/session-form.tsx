"use client";

import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { SessionType, AccessTier } from "@/types/session";
import { useTranslation } from "@/hooks/use-translation";

type SubmitStatus = "idle" | "saving" | "success" | "error";

interface SessionFormDefaultValues {
  title?: string | null;
  description?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  location?: string | null;
  type?: SessionType | null;
  speakerName?: string | null;
  speakerBio?: string | null;
  requiresAccess?: boolean;
  accessTier?: AccessTier | null;
}

interface SessionFormProps {
  defaultValues?: SessionFormDefaultValues;
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

interface FormValues {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  type: SessionType;
  speakerName: string;
  speakerBio: string;
  requiresAccess: boolean;
  accessTier: AccessTier;
}

const SESSION_TYPES: SessionType[] = [
  "talk",
  "workshop",
  "panel",
  "networking",
  "other",
];

const ACCESS_TIERS: AccessTier[] = ["regular", "premium", "vip", "staff"];

export function SessionForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitStatus = "idle",
}: SessionFormProps) {
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
      type: defaultValues?.type ?? "talk",
      speakerName: defaultValues?.speakerName ?? "",
      speakerBio: defaultValues?.speakerBio ?? "",
      requiresAccess: defaultValues?.requiresAccess ?? false,
      accessTier: defaultValues?.accessTier ?? "regular",
    },
    mode: "onBlur",
  });

  const [titleValue, requiresAccessValue] = watch(["title", "requiresAccess"]);

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
          {SESSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-2 space-y-2">
        <Label htmlFor="description">{t("common.description")}</Label>
        <Textarea
          id="description"
          aria-label="Description"
          {...register("description")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="startTime">{t("sessions.startTime")}</Label>
        <input
          type="datetime-local"
          id="startTime"
          aria-label="Start Time"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("startTime", { required: t("validation.startTimeRequired") })}
        />
        {errors.startTime && (
          <p className="text-sm text-destructive">
            {errors.startTime.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="endTime">{t("sessions.endTime")}</Label>
        <input
          type="datetime-local"
          id="endTime"
          aria-label="End Time"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("endTime", { required: t("validation.endTimeRequired") })}
        />
        {errors.endTime && (
          <p className="text-sm text-destructive">{errors.endTime.message}</p>
        )}
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
        <Label htmlFor="speakerName">{t("sessions.speakerName")}</Label>
        <Input
          id="speakerName"
          aria-label="Speaker Name"
          {...register("speakerName")}
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label htmlFor="speakerBio">{t("sessions.speakerBio")}</Label>
        <Textarea
          id="speakerBio"
          aria-label="Speaker Bio"
          {...register("speakerBio")}
        />
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

      {requiresAccessValue && (
        <div className="space-y-2">
          <Label htmlFor="accessTier">{t("sessions.accessTier")}</Label>
          <select
            id="accessTier"
            aria-label="Access Tier"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            {...register("accessTier")}
          >
            {ACCESS_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="col-span-2 flex items-center gap-4">
        <Button type="submit" disabled={isSubmitDisabled}>
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
