"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";

const postFormSchema = z.object({
  imageUrl: z.string().min(1, "Image is required"),
  description: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  authorAvatarUrl: z.string().nullable().optional(),
});

type PostFormValues = z.infer<typeof postFormSchema>;

interface PostFormProps {
  defaultValues?: {
    imageUrl?: string;
    description?: string | null;
    authorName?: string | null;
    authorAvatarUrl?: string | null;
  };
  onSubmit: (data: PostFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PostForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PostFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
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
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-6">
      <div className="space-y-2">
        <Label>Image</Label>
        <ImageUpload
          value={imageUrlValue || null}
          onChange={(url) => setValue("imageUrl", url ?? "", { shouldValidate: true })}
          disabled={isSubmitting}
        />
        {(errors.imageUrl || isImageEmpty) && (
          <p className="text-sm text-destructive">Image is required</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="authorName">Author Name</Label>
        <Input
          id="authorName"
          {...register("authorName")}
        />
      </div>

      <div className="space-y-2">
        <Label>Author Avatar</Label>
        <ImageUpload
          value={authorAvatarUrlValue || null}
          onChange={(url) => setValue("authorAvatarUrl", url)}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-2">
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
      </div>
    </form>
  );
}
