"use client";

import { useState } from "react";
import {
  ShoppingBag,
  Mic2,
  Sparkles,
  Users,
  Pencil,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { usePermissions } from "@/hooks/use-permissions";
import { StatsCard } from "@/components/stats-card";
import { useCollectionCount } from "@/hooks/use-collection-count";
import { useEventContext } from "@/hooks/use-event-context";
import { useDocument } from "@/hooks/use-document";
import { useTranslation } from "@/hooks/use-translation";
import { updateDocument } from "@/lib/firestore";
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

export default function EventOverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = useValidatedParams(params);
  const { selectedClientId } = useEventContext();
  const { isEventAdmin } = usePermissions();
  const { t } = useTranslation();
  const readOnly = isEventAdmin;
  const basePath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}`
    : "";

  const { data: event } = useDocument<Event>(
    selectedClientId ? `clients/${selectedClientId}/events` : "",
    selectedClientId ? eventId : undefined,
  );

  const { count: brandsCount, loading: brandsLoading } = useCollectionCount({
    path: basePath ? `${basePath}/brands` : "",
  });
  const { count: sessionsCount, loading: sessionsLoading } = useCollectionCount({
    path: basePath ? `${basePath}/sessions` : "",
  });
  const { count: happeningsCount, loading: happeningsLoading } = useCollectionCount({
    path: basePath ? `${basePath}/happenings` : "",
  });
  const { count: whitelistCount, loading: whitelistLoading } = useCollectionCount({
    path: basePath ? `${basePath}/whitelist` : "",
  });
  const isLoading =
    brandsLoading ||
    sessionsLoading ||
    happeningsLoading ||
    whitelistLoading;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  async function handleSubmit(data: Record<string, unknown>) {
    if (!selectedClientId) return;
    setSubmitStatus("saving");
    try {
      const firestoreData = {
        ...data,
        startDate: data.startDate instanceof Date ? Timestamp.fromDate(data.startDate) : data.startDate,
        endDate: data.endDate instanceof Date ? Timestamp.fromDate(data.endDate) : data.endDate,
      };
      await updateDocument(`clients/${selectedClientId}/events`, eventId, firestoreData);
      setSubmitStatus("success");
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

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
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
            value={whitelistCount}
            icon={Users}
          />
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("events.editTitle")}</SheetTitle>
            <SheetDescription>{t("events.editDescription")}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {event && (
              <EventForm
                clientId={selectedClientId}
                defaultValues={{
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
                storagePath={`clients/${selectedClientId}/events/${eventId}`}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
