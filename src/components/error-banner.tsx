"use client";

import { AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

interface ErrorBannerProps {
  error: Error | null;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  const { t } = useTranslation();

  if (!error) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
      <AlertCircle className="size-5 shrink-0" />
      <div>
        <p>{t("common.failedToLoad")}</p>
        {error.message && (
          <p className="mt-1 text-xs opacity-75">{error.message}</p>
        )}
      </div>
    </div>
  );
}
