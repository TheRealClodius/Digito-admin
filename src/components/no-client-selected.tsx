"use client";

import { AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export function NoClientSelected() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 rounded-md border border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 p-4 text-sm text-blue-700 dark:text-blue-300">
      <AlertCircle className="size-5 shrink-0" />
      <div>
        <p className="font-semibold">{t("noClientSelected.title")}</p>
        <p className="text-xs mt-1 opacity-90">
          {t("noClientSelected.description")}
        </p>
      </div>
    </div>
  );
}
