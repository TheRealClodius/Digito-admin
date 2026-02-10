"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownTextarea } from "@/components/markdown-textarea";
import { ImageUpload } from "@/components/image-upload";
import { useUpload } from "@/hooks/use-upload";
import { postSchema, type PostFormValues } from "@/lib/schemas";
import { useTranslation } from "@/hooks/use-translation";

type SubmitStatus = "idle" | "saving" | "success" | "error";

interface PostFormProps {
  defaultValues?: {
    imageUrl?: string;
    description?: string | null;
    authorName?: string | null;
    authorAvatarUrl?: string | null;
  };
  eventLogoUrl?: string | null;
  onSubmit: (data: PostFormValues) => void;
  onCancel: () => void;
  submitStatus?: SubmitStatus;
  storagePath?: string;
}

export function PostForm({
  defaultValues,
  eventLogoUrl,
  onSubmit,
  onCancel,
  submitStatus = "idle",
  storagePath,
}: PostFormProps) {
  const isSubmitting = submitStatus === "saving";
  const { upload, deleteFile } = useUpload({ basePath: storagePath ?? "" });
  const { t } = useTranslation();
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
  const isImageEmpty = !imageUrlValue || imageUrlValue.trim() === "";

  const handleFormSubmit = (data: PostFormValues) => {
    // Automatically use event logo as author avatar
    onSubmit({
      ...data,
      authorAvatarUrl: eventLogoUrl ?? "",
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-2 gap-x-4 gap-y-6">
      <div className="col-span-2 space-y-2">
        <Label>{t("common.image")}</Label>
        <ImageUpload
          value={imageUrlValue || null}
          onChange={(url) => setValue("imageUrl", url ?? "", { shouldValidate: true })}
          uploadFn={storagePath ? (file) => upload(file, `image_${Date.now()}_${file.name}`) : undefined}
          deleteFileFn={deleteFile}
          disabled={isSubmitting}
        />
        {(errors.imageUrl || isImageEmpty) && (
          <p className="text-sm text-destructive">{t("posts.imageRequired")}</p>
        )}
      </div>

      <MarkdownTextarea
        className="col-span-2"
        label={t("common.description")}
        fieldName="description"
        id="description"
        getCurrentValue={() => watch("description") ?? ""}
        onAccept={(text) => setValue("description", text, { shouldDirty: true })}
        textareaProps={register("description")}
      />

      <div className="col-span-2 space-y-2">
        <Label htmlFor="authorName">{t("posts.authorName")}</Label>
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
