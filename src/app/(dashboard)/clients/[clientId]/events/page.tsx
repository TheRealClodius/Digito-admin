"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useValidatedParams } from "@/hooks/use-validated-params";
import { usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/hooks/use-translation";
import { apiFetch } from "@/lib/api-client";
import { useApiCollection } from "@/hooks/use-api-collection";
import { useUpload } from "@/hooks/use-upload";
import { toDate } from "@/lib/timestamps";
import { ErrorBanner } from "@/components/error-banner";
import { EventsTable } from "@/components/tables/events-table";
import { EventForm } from "@/components/forms/event-form";
import type { Event } from "@/types/event";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

export default function EventsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = useValidatedParams(params);
  const { isEventAdmin } = usePermissions();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const readOnly = isEventAdmin;

  const apiPath = `/api/clients/${clientId}/events`;
  const queryKey = ["clients", clientId, "events"];

  const { data: events, loading, error } = useApiCollection<Event>({
    apiPath,
    queryKey,
  });

  const { deleteFile } = useUpload({ basePath: "" });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  function handleNew() {
    setEditingEvent(null);
    setSubmitStatus("idle");
    setSheetOpen(true);
  }

  function handleEdit(event: Event) {
    setEditingEvent(event);
    setSubmitStatus("idle");
    setSheetOpen(true);
  }

  async function handleSubmit(data: Record<string, unknown>) {
    setSubmitStatus("saving");
    try {
      // Convert dates to ISO strings for the API
      const apiData = {
        ...data,
        clientId,
        startDate: data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate,
        endDate: data.endDate instanceof Date ? data.endDate.toISOString() : data.endDate,
      };

      if (editingEvent) {
        await apiFetch(`${apiPath}/${editingEvent.eventCode}`, {
          method: "PUT",
          body: apiData,
        });
      } else {
        await apiFetch(apiPath, {
          method: "POST",
          body: apiData,
        });
      }
      setSubmitStatus("success");
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      setSubmitStatus("error");
      toast.error(t("crud.failedToSave", { entity: "event" }));
      console.error(err);
    }
  }

  async function handleToggleActive(eventId: string, isActive: boolean) {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    try {
      await apiFetch(`${apiPath}/${event.eventCode}`, {
        method: "PUT",
        body: { isActive },
      });
      toast.success(isActive ? t("events.activated") : t("events.deactivated"));
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error(t("events.failedToUpdateStatus"));
      console.error(err);
    }
  }

  async function handleDelete() {
    if (!deletingEventId) return;
    try {
      // Best-effort cleanup of associated Storage files
      const event = events.find((e) => e.id === deletingEventId);
      if (event) {
        const urls = [event.logoUrl, event.bannerUrl].filter(Boolean) as string[];
        await Promise.all(urls.map((url) => deleteFile(url).catch(() => {})));
        await apiFetch(`${apiPath}/${event.eventCode}`, { method: "DELETE" });
      }
      toast.success(t("events.deleted"));
      await queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error(t("events.failedToDelete"));
      console.error(err);
    } finally {
      setDeletingEventId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("events.title")}</h1>
          <p className="text-muted-foreground">
            {t("events.description")}
          </p>
        </div>
        {!readOnly && (
          <Button onClick={handleNew}>
            <Plus className="size-4" />
            {t("events.addButton")}
          </Button>
        )}
      </div>

      {error ? (
        <ErrorBanner error={error} />
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <EventsTable
          events={events}
          onEdit={readOnly ? () => {} : handleEdit}
          onDelete={readOnly ? () => {} : (id) => setDeletingEventId(id)}
          onToggleActive={readOnly ? () => {} : handleToggleActive}
        />
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingEvent ? t("events.editTitle") : t("events.newTitle")}</SheetTitle>
            <SheetDescription>
              {editingEvent
                ? t("events.editDescription")
                : t("events.newDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <EventForm
              clientId={clientId}
              defaultValues={
                editingEvent
                  ? {
                      eventCode: editingEvent.eventCode,
                      name: editingEvent.name,
                      description: editingEvent.description ?? null,
                      venue: editingEvent.venue ?? null,
                      startDate: toDate(editingEvent.startDate),
                      endDate: toDate(editingEvent.endDate),
                      websiteUrl: editingEvent.websiteUrl ?? null,
                      instagramUrl: editingEvent.instagramUrl ?? null,
                      chatPrompt: editingEvent.chatPrompt ?? null,
                      imageUrls: editingEvent.imageUrls ?? [],
                      isActive: editingEvent.isActive,
                      logoUrl: editingEvent.logoUrl ?? null,
                      bannerUrl: editingEvent.bannerUrl ?? null,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
              onCancel={() => setSheetOpen(false)}
              submitStatus={submitStatus}
              storagePath={
                editingEvent
                  ? `clients/${clientId}/events/${editingEvent.id}`
                  : `clients/${clientId}/events`
              }
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingEventId}
        onOpenChange={(open) => !open && setDeletingEventId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("events.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("events.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
