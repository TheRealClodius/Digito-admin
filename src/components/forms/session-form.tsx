"use client";

import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { SessionType, AccessTier } from "@/types/session";

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
        <Label htmlFor="title">Titolo</Label>
        <Input
          id="title"
          aria-label="Title"
          {...register("title", { required: "Title is required" })}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
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
        <Label htmlFor="description">Descrizione</Label>
        <Textarea
          id="description"
          aria-label="Description"
          {...register("description")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="startTime">Ora Inizio</Label>
        <input
          type="datetime-local"
          id="startTime"
          aria-label="Start Time"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("startTime", { required: "Start time is required" })}
        />
        {errors.startTime && (
          <p className="text-sm text-destructive">
            {errors.startTime.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="endTime">Ora Fine</Label>
        <input
          type="datetime-local"
          id="endTime"
          aria-label="End Time"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("endTime", { required: "End time is required" })}
        />
        {errors.endTime && (
          <p className="text-sm text-destructive">{errors.endTime.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Luogo</Label>
        <Input
          id="location"
          aria-label="Location"
          {...register("location")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="speakerName">Speaker Name</Label>
        <Input
          id="speakerName"
          aria-label="Speaker Name"
          {...register("speakerName")}
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label htmlFor="speakerBio">Speaker Bio</Label>
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
        <Label htmlFor="requiresAccess">Requires Access</Label>
      </div>

      {requiresAccessValue && (
        <div className="space-y-2">
          <Label htmlFor="accessTier">Access Tier</Label>
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
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        {submitStatus === "success" && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="size-4" />
            Saved
          </span>
        )}
        {submitStatus === "error" && (
          <p className="text-sm text-destructive">Failed to save</p>
        )}
      </div>
    </form>
  );
}
