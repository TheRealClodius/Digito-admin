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
      <p>Failed to load data. Check your connection and try again.</p>
    </div>
  );
}
