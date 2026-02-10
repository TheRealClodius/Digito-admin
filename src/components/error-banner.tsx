"use client";

import { AlertCircle } from "lucide-react";

interface ErrorBannerProps {
  error: Error | null;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
      <AlertCircle className="size-5 shrink-0" />
      <div>
        <p>Failed to load data. Check your connection and try again.</p>
        {error.message && (
          <p className="mt-1 text-xs opacity-75">{error.message}</p>
        )}
      </div>
    </div>
  );
}
