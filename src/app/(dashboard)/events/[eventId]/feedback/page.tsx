"use client";

import { RefreshCw } from "lucide-react";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { useEventContext } from "@/hooks/use-event-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/hooks/use-translation";
import { useFeedback } from "@/hooks/use-feedback";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/error-banner";
import { NoClientSelected } from "@/components/no-client-selected";
import { FeedbackTable } from "@/components/tables/feedback-table";

export default function FeedbackPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const { isSuperAdmin } = usePermissions();
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useFeedback(
    selectedClientId ?? "",
    eventId
  );

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("feedback.title")}
          </h1>
          <p className="text-muted-foreground">{t("feedback.description")}</p>
        </div>
        <p className="text-muted-foreground">{t("feedback.accessDenied")}</p>
      </div>
    );
  }

  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("feedback.title")}
          </h1>
          <p className="text-muted-foreground">{t("feedback.description")}</p>
        </div>
        <NoClientSelected />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("feedback.title")}
          </h1>
          <p className="text-muted-foreground">{t("feedback.description")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="mr-2 size-4" />
          {t("feedback.refreshButton")}
        </Button>
      </div>

      {error ? (
        <ErrorBanner error={new Error(error)} />
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <FeedbackTable entries={data} />
      )}
    </div>
  );
}
