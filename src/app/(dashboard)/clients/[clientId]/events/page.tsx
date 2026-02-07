"use client";

import { use, useState } from "react";
import { Plus } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";

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

import { useCollection } from "@/hooks/use-collection";
import { addDocument, updateDocument, deleteDocument } from "@/lib/firestore";
import { EventsTable } from "@/components/tables/events-table";
import { EventForm } from "@/components/forms/event-form";
import type { Event } from "@/types/event";

export default function EventsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const collectionPath = `clients/${clientId}/events`;

  const { data: events, loading } = useCollection<Event>({
    path: collectionPath,
    orderByField: "startDate",
    orderDirection: "desc",
  });

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
      // Convert date fields to Firestore Timestamps
      const firestoreData = {
        ...data,
        startDate: data.startDate instanceof Date ? Timestamp.fromDate(data.startDate) : data.startDate,
        endDate: data.endDate instanceof Date ? Timestamp.fromDate(data.endDate) : data.endDate,
      };

      if (editingEvent) {
        await updateDocument(collectionPath, editingEvent.id, firestoreData);
      } else {
        await addDocument(collectionPath, firestoreData);
      }
      setSubmitStatus("success");
    } catch (err) {
      setSubmitStatus("error");
      toast.error("Failed to save event");
      console.error(err);
    }
  }

  async function handleToggleActive(eventId: string, isActive: boolean) {
    try {
      await updateDocument(collectionPath, eventId, { isActive });
      toast.success(isActive ? "Event activated" : "Event deactivated");
    } catch (err) {
      toast.error("Failed to update event status");
      console.error(err);
    }
  }

  async function handleDelete() {
    if (!deletingEventId) return;
    try {
      await deleteDocument(collectionPath, deletingEventId);
      toast.success("Event deleted");
    } catch (err) {
      toast.error("Failed to delete event");
      console.error(err);
    } finally {
      setDeletingEventId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Manage events for this client
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          New Event
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <EventsTable
          events={events}
          onEdit={handleEdit}
          onDelete={(id) => setDeletingEventId(id)}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingEvent ? "Edit Event" : "New Event"}</SheetTitle>
            <SheetDescription>
              {editingEvent
                ? "Update the event details below."
                : "Fill in the details to create a new event."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <EventForm
              clientId={clientId}
              defaultValues={
                editingEvent
                  ? {
                      name: editingEvent.name,
                      description: editingEvent.description ?? null,
                      venue: editingEvent.venue ?? null,
                      startDate: editingEvent.startDate?.toDate(),
                      endDate: editingEvent.endDate?.toDate(),
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
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be
              undone and will remove all data (brands, sessions, etc.) under
              this event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
