"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  isSubmitting = false,
}: EventFormProps) {
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

  const nameValue = watch("name");
  const isActiveValue = watch("isActive");

  const isSubmitDisabled = !nameValue?.trim() || isSubmitting;

  const onFormSubmit = (data: FormValues) => {
    onSubmit({
      clientId,
      ...data,
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          aria-label="Name"
          {...register("name", { required: "Name is required" })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
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

      {/* Venue */}
      <div className="space-y-2">
        <Label htmlFor="venue">Venue</Label>
        <Input
          id="venue"
          aria-label="Venue"
          {...register("venue")}
        />
      </div>

      {/* Start Date */}
      <div className="space-y-2">
        <Label htmlFor="startDate">Start Date</Label>
        <input
          type="datetime-local"
          id="startDate"
          aria-label="Start Date"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("startDate", { required: "Start date is required" })}
        />
        {errors.startDate && (
          <p className="text-sm text-destructive">{errors.startDate.message}</p>
        )}
      </div>

      {/* End Date */}
      <div className="space-y-2">
        <Label htmlFor="endDate">End Date</Label>
        <input
          type="datetime-local"
          id="endDate"
          aria-label="End Date"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("endDate", { required: "End date is required" })}
        />
        {errors.endDate && (
          <p className="text-sm text-destructive">{errors.endDate.message}</p>
        )}
      </div>

      {/* Website URL */}
      <div className="space-y-2">
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input
          id="websiteUrl"
          aria-label="Website URL"
          {...register("websiteUrl")}
        />
      </div>

      {/* Instagram URL */}
      <div className="space-y-2">
        <Label htmlFor="instagramUrl">Instagram URL</Label>
        <Input
          id="instagramUrl"
          aria-label="Instagram URL"
          {...register("instagramUrl")}
        />
      </div>

      {/* Chat Prompt */}
      <div className="space-y-2">
        <Label htmlFor="chatPrompt">Chat Prompt</Label>
        <Input
          id="chatPrompt"
          aria-label="Chat Prompt"
          placeholder="Ask me anything about your event"
          {...register("chatPrompt")}
        />
      </div>

      {/* Is Active */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          role="switch"
          id="isActive"
          aria-label="Active"
          checked={isActiveValue}
          onChange={(e) => setValue("isActive", e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Drag & drop or click to upload
        </div>
      </div>

      {/* Banner */}
      <div className="space-y-2">
        <Label>Banner</Label>
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Drag & drop or click to upload
        </div>
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
