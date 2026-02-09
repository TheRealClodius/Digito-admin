"use client";

import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
}: EventFormProps) {
  const isSubmitting = submitStatus === "saving";
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

  const [nameValue, isActiveValue] = watch(["name", "isActive"]);

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
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          aria-label="Name"
          {...register("name", { required: "Name is required" })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue">Sede</Label>
        <Input
          id="venue"
          aria-label="Venue"
          {...register("venue")}
        />
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
        <Label htmlFor="startDate">Data Inizio</Label>
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

      <div className="space-y-2">
        <Label htmlFor="endDate">Data Fine</Label>
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

      <div className="space-y-2">
        <Label htmlFor="websiteUrl">URL Sito Web</Label>
        <Input
          id="websiteUrl"
          aria-label="Website URL"
          {...register("websiteUrl")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagramUrl">URL Instagram</Label>
        <Input
          id="instagramUrl"
          aria-label="Instagram URL"
          {...register("instagramUrl")}
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label htmlFor="chatPrompt">Prompt Chat</Label>
        <Input
          id="chatPrompt"
          aria-label="Chat Prompt"
          placeholder="Ask me anything about your event"
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
        <Label htmlFor="isActive">Attivo</Label>
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Drag & drop or click to upload
        </div>
      </div>

      <div className="space-y-2">
        <Label>Banner</Label>
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Drag & drop or click to upload
        </div>
      </div>

      <div className="col-span-2 flex items-center gap-4">
        <Button type="submit" disabled={isSubmitDisabled}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
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
