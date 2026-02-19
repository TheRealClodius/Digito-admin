"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventForm } from "@/components/forms/event-form";
import { apiFetch } from "@/lib/api-client";
import { useTranslation } from "@/hooks/use-translation";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onEventCreated: (eventCode: string, eventName: string) => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  clientId,
  onEventCreated,
}: CreateEventDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");

  const { data: nextCodeData } = useQuery({
    queryKey: ["events", "next-code"],
    queryFn: () => apiFetch<{ nextEventCode: string }>("/api/events/next-code"),
    enabled: open,
    staleTime: 0,
  });

  async function handleSubmit(data: Record<string, unknown>) {
    setSubmitStatus("saving");
    try {
      const apiData = {
        ...data,
        clientId,
        startDate:
          data.startDate instanceof Date
            ? data.startDate.toISOString()
            : data.startDate,
        endDate:
          data.endDate instanceof Date
            ? data.endDate.toISOString()
            : data.endDate,
      };

      const result = await apiFetch<{ eventCode: string }>(`/api/clients/${clientId}/events`, {
        method: "POST",
        body: apiData,
      });
      setSubmitStatus("success");
      toast.success(t("contextSelector.eventCreated"));
      await queryClient.invalidateQueries({ queryKey: ["clients", clientId, "events"] });
      onEventCreated(result.eventCode, data.name as string);
      onOpenChange(false);
    } catch (err) {
      setSubmitStatus("error");
      toast.error(t("crud.failedToSave", { entity: "event" }));
      console.error(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullScreen
        className="flex h-screen w-screen max-w-none flex-col gap-0 p-0"
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{t("events.newTitle")}</DialogTitle>
          <DialogDescription>{t("events.newDescription")}</DialogDescription>
        </DialogHeader>
        <div className="scroll-fade-bottom flex-1 overflow-y-auto px-6 pt-6 pb-12">
          <div className="mx-auto max-w-4xl">
            <EventForm
              key={nextCodeData?.nextEventCode ?? "loading"}
              clientId={clientId}
              suggestedEventCode={nextCodeData?.nextEventCode}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
              submitStatus={submitStatus}
              storagePath={`clients/${clientId}/events`}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
