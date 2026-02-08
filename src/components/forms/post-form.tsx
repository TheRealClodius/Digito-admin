"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { useUpload } from "@/hooks/use-upload";
import { postSchema, type PostFormValues } from "@/lib/schemas";

type SubmitStatus = "idle" | "saving" | "success" | "error";

interface PostFormProps {
  defaultValues?: {
    imageUrl?: string;
    description?: string | null;
    authorName?: string | null;
    authorAvatarUrl?: string | null;
  };
  onSubmit: (data: PostFormValues) => void;
  onCancel: () => void;
  submitStatus?: SubmitStatus;
  storagePath?: string;
}

export function PostForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitStatus = "idle",
  storagePath,
}: PostFormProps) {
  const isSubmitting = submitStatus === "saving";
  const { upload } = useUpload({ basePath: storagePath ?? "" });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      imageUrl: defaultValues?.imageUrl ?? "",
      description: defaultValues?.description ?? "",
      authorName: defaultValues?.authorName ?? "",
      authorAvatarUrl: defaultValues?.authorAvatarUrl ?? "",
    },
    mode: "onTouched",
  });

  const imageUrlValue = watch("imageUrl");
  const authorAvatarUrlValue = watch("authorAvatarUrl");
  const isImageEmpty = !imageUrlValue || imageUrlValue.trim() === "";

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="grid grid-cols-2 gap-x-4 gap-y-6">
      <div className="space-y-2">
        <Label>Image</Label>
        <ImageUpload
          value={imageUrlValue || null}
          onChange={(url) => setValue("imageUrl", url ?? "", { shouldValidate: true })}
          uploadFn={storagePath ? (file) => upload(file, `image_${Date.now()}_${file.name}`) : undefined}
          disabled={isSubmitting}
        />
        {(errors.imageUrl || isImageEmpty) && (
          <p className="text-sm text-destructive">Image is required</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Author Avatar</Label>
        <ImageUpload
          value={authorAvatarUrlValue || null}
          onChange={(url) => setValue("authorAvatarUrl", url)}
          uploadFn={storagePath ? (file) => upload(file, `avatar_${Date.now()}_${file.name}`) : undefined}
          disabled={isSubmitting}
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label htmlFor="authorName">Author Name</Label>
        <Input
          id="authorName"
          {...register("authorName")}
        />
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <Button
          type="submit"
          disabled={isImageEmpty || isSubmitting}
        >
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
