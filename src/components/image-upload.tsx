"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  uploadFn?: (file: File) => Promise<string>;
  disabled?: boolean;
  className?: string;
  maxSize?: number;
  accept?: Record<string, string[]>;
}

export function ImageUpload({
  value,
  onChange,
  uploadFn,
  disabled,
  className,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] },
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      if (uploadFn) {
        setUploading(true);
        try {
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
    [uploadFn, onChange]
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
    setPreview(null);
    onChange(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {displayUrl ? (
        <div className="relative inline-block">
          <Image
            src={displayUrl}
            alt="Upload preview"
            width={200}
            height={200}
            className="rounded-md border object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/60">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 size-6"
            onClick={handleRemove}
            disabled={disabled || uploading}
          >
            <X className="size-3" />
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
              ? "Drop the file here"
              : "Drag & drop or click to upload"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Max size: {Math.round(maxSize / 1024 / 1024)}MB
          </p>
        </div>
      )}
    </div>
  );
}
