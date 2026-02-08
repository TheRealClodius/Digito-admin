"use client";

import { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { sanitizeFilename } from "@/lib/validation";

interface UseUploadOptions {
  basePath: string;
}

export function useUpload({ basePath }: UseUploadOptions) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function upload(file: File, filename?: string): Promise<string> {
    const name = sanitizeFilename(filename || file.name);
    const storageRef = ref(storage, `${basePath}/${name}`);

    setUploading(true);
    setProgress(0);
    setError(null);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(pct));
        },
        (err) => {
          setError(err);
          setUploading(false);
          reject(err);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setUploading(false);
          setProgress(100);
          resolve(url);
        }
      );
    });
  }

  async function deleteFile(fileUrl: string) {
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
    } catch (err) {
      // File may not exist, ignore
      console.error("Failed to delete file:", err);
    }
  }

  return { upload, deleteFile, progress, uploading, error };
}
