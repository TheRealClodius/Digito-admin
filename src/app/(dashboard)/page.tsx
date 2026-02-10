"use client";

import { useEventContext } from "@/hooks/use-event-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/hooks/use-translation";

export default function DashboardHome() {
  const { selectedClientId, selectedEventId, selectedClientName, selectedEventName } =
    useEventContext();
  const { isSuperAdmin } = usePermissions();
  const { t } = useTranslation();

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("unauthorized.title")}</h1>
        <p className="text-muted-foreground">
          {t("unauthorized.description")}
        </p>
      </div>
    );
  }

  if (!selectedClientId || !selectedEventId) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.welcome")}</h1>
        <p className="text-muted-foreground">
          {t("dashboard.selectPrompt")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">
          {selectedClientName} &mdash; {selectedEventName}
        </p>
      </div>
      <p className="text-muted-foreground">
        {t("dashboard.navigatePrompt")}
      </p>
    </div>
  );
}
