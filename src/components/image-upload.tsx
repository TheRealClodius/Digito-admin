"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { isAllowedImageHost } from "@/lib/validation";
import { useTranslation } from "@/hooks/use-translation";
import { useDissolveEffect } from "@/hooks/use-dissolve-effect";
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
  const [dissolving, setDissolving] = useState(false);
  const [removed, setRemoved] = useState(false);
  const prevObjectUrl = useRef<string | null>(null);
  const filterId = useRef(`dissolve-${Math.random().toString(36).slice(2, 9)}`);
  const bigNoiseRef = useRef<SVGFETurbulenceElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollParentRef = useRef<HTMLElement | null>(null);
  const savedScrollRef = useRef<number | null>(null);

  const handleDissolveComplete = useCallback(() => {
    if (value && deleteFileFn) {
      deleteFileFn(value).catch(() => {});
    }
    setPreview(null);
    setDissolving(false);
    setRemoved(true);
    onChange(null);
  }, [value, deleteFileFn, onChange]);

  const dissolveEffect = useDissolveEffect(
    { bigNoiseRef, displacementRef, imageRef, containerRef },
    { onComplete: handleDissolveComplete }
  );

  // Revoke old blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (prevObjectUrl.current) {
        URL.revokeObjectURL(prevObjectUrl.current);
      }
    };
  }, []);

  // Cancel dissolve animation on unmount
  useEffect(() => {
    return () => {
      dissolveEffect.cancel();
    };
  }, [dissolveEffect]);

  // Restore scroll position when dissolve ends (overflow reverts to auto)
  useLayoutEffect(() => {
    if (!dissolving && savedScrollRef.current !== null) {
      const scrollEl = scrollParentRef.current;
      if (scrollEl) {
        scrollEl.scrollTop = savedScrollRef.current;
        scrollEl.style.removeProperty('--scroll-offset');
      }
      savedScrollRef.current = null;
    }
  }, [dissolving]);

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
      setRemoved(false);
      setPreview(objectUrl);

      if (uploadFn) {
        setUploading(true);
        try {
          // Delete old Storage file before uploading replacement
          if (value && deleteFileFn) {
            deleteFileFn(value).catch(() => {});
          }
          const downloadUrl = await uploadFn(file);
          setPreview(null);
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

  const displayUrl = removed ? null : (preview || value);

  const handleRemove = useCallback(() => {
    if (dissolving) return;
    // Save scroll position and set CSS offset before overflow:visible kicks in
    const scrollEl = containerRef.current?.closest('.scroll-fade-bottom') as HTMLElement | null;
    if (scrollEl) {
      scrollParentRef.current = scrollEl;
      savedScrollRef.current = scrollEl.scrollTop;
      scrollEl.style.setProperty('--scroll-offset', `${-scrollEl.scrollTop}px`);
    }
    setDissolving(true);
    dissolveEffect.start();
  }, [dissolving, dissolveEffect]);

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      {displayUrl ? (
        <div
          key="preview"
          className={cn(
            "group relative inline-block",
            dissolving && "z-20 overflow-visible"
          )}
          ref={containerRef}
          data-dissolving={dissolving || undefined}
        >
          <svg width="0" height="0" className="absolute" aria-hidden="true">
            <defs>
              <filter
                id={filterId.current}
                x="-200%"
                y="-200%"
                width="700%"
                height="700%"
                colorInterpolationFilters="sRGB"
              >
                <feTurbulence
                  ref={bigNoiseRef}
                  type="fractalNoise"
                  baseFrequency="0.004"
                  numOctaves={1}
                  seed="0"
                  result="bigNoise"
                />
                <feComponentTransfer in="bigNoise" result="bigNoiseAdjusted">
                  <feFuncR type="linear" slope="5" intercept="-2" />
                  <feFuncG type="linear" slope="5" intercept="-2" />
                </feComponentTransfer>
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="1"
                  numOctaves={1}
                  result="fineNoise"
                />
                <feMerge result="mergedNoise">
                  <feMergeNode in="bigNoiseAdjusted" />
                  <feMergeNode in="fineNoise" />
                </feMerge>
                <feDisplacementMap
                  ref={displacementRef}
                  in="SourceGraphic"
                  in2="mergedNoise"
                  scale="0"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>
          {!displayUrl.startsWith("blob:") && isAllowedImageHost(displayUrl) ? (
            <Image
              ref={imageRef}
              src={displayUrl}
              alt={t("common.uploadPreview")}
              width={200}
              height={200}
              className="rounded-md border object-cover"
              style={{
                filter: `url(#${filterId.current})`,
                willChange: dissolving ? "transform, opacity" : "auto",
              }}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              ref={imageRef as React.RefObject<HTMLImageElement>}
              src={displayUrl}
              alt={t("common.uploadPreview")}
              width={200}
              height={200}
              className="rounded-md border object-cover"
              style={{
                filter: `url(#${filterId.current})`,
                willChange: dissolving ? "transform, opacity" : "auto",
              }}
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
            disabled={disabled || uploading || dissolving}
            aria-label={dissolving ? t("common.deleting") : t("common.delete")}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ) : (
        <div
          key="dropzone"
          {...getRootProps()}
          className={cn(
            "flex aspect-square w-full max-w-[200px] min-w-[160px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border-2 border-dashed bg-muted/20 px-4 py-4 transition-colors hover:bg-muted/40 animate-in fade-in-0 duration-300",
            isDragActive && "bg-muted/50",
            (disabled || uploading) && "cursor-not-allowed opacity-50"
          )}
          style={{ borderColor: isDragActive ? 'var(--primary)' : 'var(--muted-foreground)' }}
        >
          <input {...getInputProps()} />
          <Upload className="mb-2 size-8 shrink-0 text-muted-foreground" />
          <p className="min-w-0 break-words text-center text-sm text-muted-foreground">
            {isDragActive
              ? t("common.dropHere")
              : t("common.dragAndDrop")}
          </p>
          <p className="mt-1 min-w-0 text-center text-xs text-muted-foreground">
            {t("common.maxSize", { size: Math.round(maxSize / 1024 / 1024) })}
          </p>
        </div>
      )}
    </div>
  );
}
