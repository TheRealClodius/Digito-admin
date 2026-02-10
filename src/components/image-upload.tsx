"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { isAllowedImageHost } from "@/lib/validation";
import { useTranslation } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  uploadFn?: (file: File) => Promise<string>;
  deleteFileFn?: (url: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
  maxSize?: number;
  accept?: Record<string, string[]>;
}

export function ImageUpload({
  value,
  onChange,
  uploadFn,
  deleteFileFn,
  disabled,
  className,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] },
}: ImageUploadProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const prevObjectUrl = useRef<string | null>(null);

  // Revoke old blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (prevObjectUrl.current) {
        URL.revokeObjectURL(prevObjectUrl.current);
      }
    };
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Revoke previous blob URL before creating a new one
      if (prevObjectUrl.current) {
        URL.revokeObjectURL(prevObjectUrl.current);
      }

      const objectUrl = URL.createObjectURL(file);
      prevObjectUrl.current = objectUrl;
      setPreview(objectUrl);

      if (uploadFn) {
        setUploading(true);
        try {
          // Delete old Storage file before uploading replacement
          if (value && deleteFileFn) {
            deleteFileFn(value).catch(() => {});
          }
          const downloadUrl = await uploadFn(file);
          onChange(downloadUrl);
        } catch (err) {
          console.error("Upload failed:", err);
          setPreview(null);
        } finally {
          setUploading(false);
        }
      }
    },
    [uploadFn, deleteFileFn, onChange, value]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: 1,
    disabled: disabled || uploading,
  });

  const displayUrl = preview || value;

  const handleRemove = () => {
    if (value && deleteFileFn) {
      deleteFileFn(value).catch(() => {});
    }
    setPreview(null);
    onChange(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {displayUrl ? (
        <div className="group relative inline-block">
          {isAllowedImageHost(displayUrl) ? (
            <Image
              src={displayUrl}
              alt={t("common.uploadPreview")}
              width={200}
              height={200}
              className="rounded-md border object-cover"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={displayUrl}
              alt={t("common.uploadPreview")}
              width={200}
              height={200}
              className="rounded-md border object-cover"
            />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 size-6 bg-white text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 hover:bg-white/90 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={handleRemove}
            disabled={disabled || uploading}
            aria-label={t("common.delete")}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-6 transition-colors hover:border-primary/50 hover:bg-muted/50",
            isDragActive && "border-primary bg-muted/50",
            (disabled || uploading) && "cursor-not-allowed opacity-50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mb-2 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? t("common.dropHere")
              : t("common.dragAndDrop")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("common.maxSize", { size: Math.round(maxSize / 1024 / 1024) })}
          </p>
        </div>
      )}
    </div>
  );
}
