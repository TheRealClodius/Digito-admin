"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { sanitizeFilename } from "@/lib/validation";

interface UseUploadOptions {
  basePath: string;
}

interface PresignedResponse {
  presignedUrl: string;
  publicUrl: string;
  key: string;
}

export function useUpload({ basePath }: UseUploadOptions) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function upload(file: File, filename?: string): Promise<string> {
    const name = filename || file.name;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // 1. Get presigned URL from our API
      const { presignedUrl, publicUrl } = await apiFetch<PresignedResponse>("/api/upload", {
        method: "POST",
        body: {
          filename: name,
          contentType: file.type,
          basePath,
        },
      });

      // 2. Upload directly to R2 via presigned URL with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (e) => {
          if (e.total > 0) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Upload failed"));
        };

        xhr.send(file);
      });

      setUploading(false);
      setProgress(100);
      return publicUrl;
    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error("Upload failed");
      setError(uploadError);
      setUploading(false);
      throw uploadError;
    }
  }

  async function deleteFile(fileUrl: string) {
    try {
      // Extract the key from the public URL
      const url = new URL(fileUrl);
      const key = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;

      await apiFetch(`/api/upload?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
    } catch (err) {
      // File may not exist, ignore
      console.error("Failed to delete file:", err);
    }
  }

  return { upload, deleteFile, progress, uploading, error };
}
