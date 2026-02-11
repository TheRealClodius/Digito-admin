"use client";

import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventForm } from "@/components/forms/event-form";
import { addDocument } from "@/lib/firestore";
import { useTranslation } from "@/hooks/use-translation";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onEventCreated: (eventId: string, eventName: string) => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  clientId,
  onEventCreated,
}: CreateEventDialogProps) {
  const { t } = useTranslation();
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");

  async function handleSubmit(data: Record<string, unknown>) {
    setSubmitStatus("saving");
    try {
      const firestoreData = {
        ...data,
        startDate:
          data.startDate instanceof Date
            ? Timestamp.fromDate(data.startDate)
            : data.startDate,
        endDate:
          data.endDate instanceof Date
            ? Timestamp.fromDate(data.endDate)
            : data.endDate,
      };

      const newId = await addDocument(
        `clients/${clientId}/events`,
        firestoreData,
      );
      setSubmitStatus("success");
      toast.success(t("contextSelector.eventCreated"));
      onEventCreated(newId, data.name as string);
      onOpenChange(false);
    } catch (err) {
      setSubmitStatus("error");
      toast.error(t("crud.failedToSave", { entity: "event" }));
      console.error(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-screen w-screen max-w-none flex-col gap-0 rounded-none p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{t("events.newTitle")}</DialogTitle>
          <DialogDescription>{t("events.newDescription")}</DialogDescription>
        </DialogHeader>
        <div className="scroll-fade-bottom flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-4xl">
            <EventForm
              clientId={clientId}
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
