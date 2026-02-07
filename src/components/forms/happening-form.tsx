"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { HappeningType } from "@/types/happening";

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
  isSubmitting?: boolean;
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
  isSubmitting = false,
}: HappeningFormProps) {
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

  const titleValue = watch("title");
  const isHighlightedValue = watch("isHighlighted");
  const requiresAccessValue = watch("requiresAccess");

  const isSubmitDisabled = !titleValue?.trim() || isSubmitting;

  const onFormSubmit = (data: FormValues) => {
    onSubmit({ ...data });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          aria-label="Title"
          {...register("title", { required: "Title is required" })}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          aria-label="Description"
          {...register("description")}
        />
      </div>

      {/* Start Time */}
      <div className="space-y-2">
        <Label htmlFor="startTime">Start Time</Label>
        <input
          type="datetime-local"
          id="startTime"
          aria-label="Start Time"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("startTime")}
        />
      </div>

      {/* End Time */}
      <div className="space-y-2">
        <Label htmlFor="endTime">End Time</Label>
        <input
          type="datetime-local"
          id="endTime"
          aria-label="End Time"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("endTime")}
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          aria-label="Location"
          {...register("location")}
        />
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
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

      {/* Host Name */}
      <div className="space-y-2">
        <Label htmlFor="hostName">Host Name</Label>
        <Input
          id="hostName"
          aria-label="Host Name"
          {...register("hostName")}
        />
      </div>

      {/* Is Highlighted */}
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
        <Label htmlFor="isHighlighted">Highlighted</Label>
      </div>

      {/* Requires Access */}
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

      {/* Buttons */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitDisabled}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
