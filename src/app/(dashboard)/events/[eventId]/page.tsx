"use client";

import {
  ShoppingBag,
  Mic2,
  Sparkles,
  Users,
  ListChecks,
} from "lucide-react";
import { useValidatedParams } from "@/hooks/use-validated-params";
import { StatsCard } from "@/components/stats-card";
import { useCollectionCount } from "@/hooks/use-collection-count";
import { useEventContext } from "@/hooks/use-event-context";
import { useTranslation } from "@/hooks/use-translation";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventOverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const { t } = useTranslation();
  const basePath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}`
    : "";

  const { count: brandsCount, loading: brandsLoading } = useCollectionCount({
    path: basePath ? `${basePath}/brands` : "",
  });
  const { count: sessionsCount, loading: sessionsLoading } = useCollectionCount({
    path: basePath ? `${basePath}/sessions` : "",
  });
  const { count: happeningsCount, loading: happeningsLoading } = useCollectionCount({
    path: basePath ? `${basePath}/happenings` : "",
  });
  const { count: participantsCount, loading: participantsLoading } = useCollectionCount({
    path: basePath ? `${basePath}/participants` : "",
  });
  const { count: whitelistCount, loading: whitelistLoading } = useCollectionCount({
    path: basePath ? `${basePath}/whitelist` : "",
  });
  const isLoading =
    brandsLoading ||
    sessionsLoading ||
    happeningsLoading ||
    participantsLoading ||
    whitelistLoading;

  if (!selectedClientId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">
          {t("eventOverview.selectClientPrompt")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("eventOverview.title")}</h1>
        <p className="text-muted-foreground">
          {t("eventOverview.description")}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title={t("eventOverview.totalBrands")}
            value={brandsCount}
            icon={ShoppingBag}
          />
          <StatsCard
            title={t("eventOverview.totalSessions")}
            value={sessionsCount}
            icon={Mic2}
          />
          <StatsCard
            title={t("eventOverview.totalHappenings")}
            value={happeningsCount}
            icon={Sparkles}
          />
          <StatsCard
            title={t("eventOverview.participants")}
            value={participantsCount}
            icon={Users}
          />
          <StatsCard
            title={t("eventOverview.whitelisted")}
            value={whitelistCount}
            icon={ListChecks}
          />
        </div>
      )}
    </div>
  );
}
