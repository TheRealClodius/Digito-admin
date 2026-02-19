"use client";

import { useState } from "react";
import {
  ShoppingBag,
  Mic2,
  Sparkles,
  Users,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { usePermissions } from "@/hooks/use-permissions";
import { StatsCard } from "@/components/stats-card";
import { useEventContext } from "@/hooks/use-event-context";
import { useApiDocument } from "@/hooks/use-api-document";
import { useTranslation } from "@/hooks/use-translation";
import { apiFetch } from "@/lib/api-client";
import { toDate } from "@/lib/timestamps";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { EventForm } from "@/components/forms/event-form";
import type { Event } from "@/types/event";
import { useQueryClient } from "@tanstack/react-query";

export default function EventOverviewPage({
  params,
}: {
  params: Promise<{ eventCode: string }>;
}) {
  const { eventCode } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const { isEventAdmin } = usePermissions();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const readOnly = isEventAdmin;

  const { data: event } = useApiDocument<Event>({
    apiPath: selectedClientId ? `/api/clients/${selectedClientId}/events/${eventCode}` : "",
    queryKey: ["clients", selectedClientId ?? "", "events", eventCode],
    enabled: !!selectedClientId,
  });

  // Fetch stats from the dedicated stats endpoint
  const { data: stats, loading: statsLoading } = useApiDocument<{
    brands: number;
    sessions: number;
    happenings: number;
    whitelist: number;
    users: number;
    posts: number;
  }>({
    apiPath: `/api/events/${eventCode}/stats`,
    queryKey: ["events", eventCode, "stats"],
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  async function handleSubmit(data: Record<string, unknown>) {
    if (!selectedClientId) return;
    setSubmitStatus("saving");
    try {
      const apiData = {
        ...data,
        startDate: data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate,
        endDate: data.endDate instanceof Date ? data.endDate.toISOString() : data.endDate,
      };
      await apiFetch(`/api/clients/${selectedClientId}/events/${eventCode}`, {
        method: "PUT",
        body: apiData,
      });
      setSubmitStatus("success");
      await queryClient.invalidateQueries({ queryKey: ["clients", selectedClientId, "events", eventCode] });
    } catch (err) {
      setSubmitStatus("error");
      toast.error(t("crud.failedToSave", { entity: "event" }));
      console.error(err);
    }
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("eventOverview.title")}</h1>
          <p className="text-muted-foreground">
            {t("eventOverview.description")}
          </p>
        </div>
        {!readOnly && (
          <Button
            variant="outline"
            onClick={() => {
              setSubmitStatus("idle");
              setSheetOpen(true);
            }}
          >
            <Pencil className="size-4" />
            {t("common.edit")}
          </Button>
        )}
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title={t("eventOverview.totalBrands")}
            value={stats?.brands ?? 0}
            icon={ShoppingBag}
          />
          <StatsCard
            title={t("eventOverview.totalSessions")}
            value={stats?.sessions ?? 0}
            icon={Mic2}
          />
          <StatsCard
            title={t("eventOverview.totalHappenings")}
            value={stats?.happenings ?? 0}
            icon={Sparkles}
          />
          <StatsCard
            title={t("eventOverview.participants")}
            value={stats?.whitelist ?? 0}
            icon={Users}
          />
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("events.editTitle")}</SheetTitle>
            <SheetDescription>{t("events.editDescription")}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {event && (
              <EventForm
                clientId={selectedClientId}
                defaultValues={{
                  eventCode: eventCode,
                  name: event.name,
                  description: event.description ?? null,
                  venue: event.venue ?? null,
                  startDate: toDate(event.startDate),
                  endDate: toDate(event.endDate),
                  websiteUrl: event.websiteUrl ?? null,
                  instagramUrl: event.instagramUrl ?? null,
                  chatPrompt: event.chatPrompt ?? null,
                  imageUrls: event.imageUrls ?? [],
                  isActive: event.isActive,
                  logoUrl: event.logoUrl ?? null,
                  bannerUrl: event.bannerUrl ?? null,
                }}
                onSubmit={handleSubmit}
                onCancel={() => setSheetOpen(false)}
                submitStatus={submitStatus}
                storagePath={`clients/${selectedClientId}/events/${eventCode}`}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
