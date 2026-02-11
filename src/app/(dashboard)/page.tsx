"use client";

import { usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/hooks/use-translation";
import { useAggregateStats } from "@/hooks/use-aggregate-stats";
import { StatsCard } from "@/components/stats-card";
import { Users, Building2, Calendar, CheckCircle } from "lucide-react";

export default function DashboardHome() {
  const { isSuperAdmin, role } = usePermissions();
  const { t } = useTranslation();
  const { stats, loading } = useAggregateStats();

  // Non-admin users (no role at all) see access denied
  if (!role) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("unauthorized.title")}</h1>
        <p className="text-muted-foreground">
          {t("unauthorized.description")}
        </p>
      </div>
    );
  }

  // ClientAdmin / EventAdmin see a welcome page prompting event selection
  if (!isSuperAdmin) {
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
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.superAdminTitle")}</h1>
        <p className="text-muted-foreground">{t("dashboard.platformOverview")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("dashboard.totalClients")}
          value={stats.totalClients}
          icon={Building2}
          loading={loading}
        />
        <StatsCard
          title={t("dashboard.totalEvents")}
          value={stats.totalEvents}
          icon={Calendar}
          loading={loading}
        />
        <StatsCard
          title={t("dashboard.activeEvents")}
          value={stats.activeEvents}
          icon={CheckCircle}
          loading={loading}
        />
        <StatsCard
          title={t("dashboard.totalParticipants")}
          value={stats.totalParticipants}
          icon={Users}
          loading={loading}
        />
      </div>
    </div>
  );
}
