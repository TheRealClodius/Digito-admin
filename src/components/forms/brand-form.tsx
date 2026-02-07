"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/image-upload";

type SubmitStatus = "idle" | "saving" | "success" | "error";

const brandFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  stallNumber: z.string().nullable().optional(),
  isHighlighted: z.boolean().optional(),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

interface BrandFormProps {
  defaultValues?: {
    name?: string;
    description?: string | null;
    logoUrl?: string | null;
    imageUrl?: string | null;
    websiteUrl?: string | null;
    instagramUrl?: string | null;
    stallNumber?: string | null;
    isHighlighted?: boolean;
  };
  onSubmit: (data: BrandFormValues) => void;
  onCancel: () => void;
  submitStatus?: SubmitStatus;
}

export function BrandForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitStatus = "idle",
}: BrandFormProps) {
  const isSubmitting = submitStatus === "saving";
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      logoUrl: defaultValues?.logoUrl ?? "",
      imageUrl: defaultValues?.imageUrl ?? "",
      websiteUrl: defaultValues?.websiteUrl ?? "",
      instagramUrl: defaultValues?.instagramUrl ?? "",
      stallNumber: defaultValues?.stallNumber ?? "",
      isHighlighted: defaultValues?.isHighlighted ?? false,
    },
    mode: "onTouched",
  });

  const nameValue = watch("name");
  const logoUrlValue = watch("logoUrl");
  const imageUrlValue = watch("imageUrl");
  const isHighlightedValue = watch("isHighlighted");
  const isNameEmpty = !nameValue || nameValue.trim() === "";

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data))}
      className="grid grid-cols-2 gap-x-4 gap-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
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
        <Label htmlFor="stallNumber">Stall Number</Label>
        <Input id="stallNumber" {...register("stallNumber")} />
      </div>

      <div className="col-span-2 space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input id="websiteUrl" {...register("websiteUrl")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagramUrl">Instagram URL</Label>
        <Input id="instagramUrl" {...register("instagramUrl")} />
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <ImageUpload
          value={logoUrlValue || null}
          onChange={(url) => setValue("logoUrl", url)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label>Image</Label>
        <ImageUpload
          value={imageUrlValue || null}
          onChange={(url) => setValue("imageUrl", url)}
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
        <Label htmlFor="isHighlighted">Highlighted</Label>
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <Button type="submit" disabled={isNameEmpty || isSubmitting}>
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
