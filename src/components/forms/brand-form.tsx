"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/image-upload";
import { useUpload } from "@/hooks/use-upload";
import { brandSchema, type BrandFormValues } from "@/lib/schemas";

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
  const { upload } = useUpload({ basePath: storagePath ?? "" });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
        <Input id="websiteUrl" {...register("websiteUrl")} type="url" />
        {errors.websiteUrl && (
          <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagramUrl">Instagram URL</Label>
        <Input id="instagramUrl" {...register("instagramUrl")} type="url" />
        {errors.instagramUrl && (
          <p className="text-sm text-destructive">{errors.instagramUrl.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <ImageUpload
          value={logoUrlValue || null}
          onChange={(url) => setValue("logoUrl", url)}
          uploadFn={storagePath ? (file) => upload(file, `logo_${Date.now()}_${file.name}`) : undefined}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label>Image</Label>
        <ImageUpload
          value={imageUrlValue || null}
          onChange={(url) => setValue("imageUrl", url)}
          uploadFn={storagePath ? (file) => upload(file, `image_${Date.now()}_${file.name}`) : undefined}
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
