"use client";

import { use, useState } from "react";
import { Plus } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useCollection } from "@/hooks/use-collection";
import { useEventContext } from "@/hooks/use-event-context";
import { addDocument, updateDocument, deleteDocument } from "@/lib/firestore";
import { SessionsTable } from "@/components/tables/sessions-table";
import { SessionForm } from "@/components/forms/session-form";
import type { Session } from "@/types/session";

export default function SessionsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/sessions`
    : "";

  const { data: sessions, loading } = useCollection<Session>({
    path: collectionPath,
    orderByField: "startTime",
    orderDirection: "asc",
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  function handleNew() { setEditingSession(null); setSubmitStatus("idle"); setSheetOpen(true); }
  function handleEdit(session: Session) { setEditingSession(session); setSubmitStatus("idle"); setSheetOpen(true); }

  async function handleSubmit(data: Record<string, unknown>) {
    if (!collectionPath) return;
    setSubmitStatus("saving");
    try {
      const firestoreData = {
        ...data,
        startTime: data.startTime instanceof Date ? Timestamp.fromDate(data.startTime) : data.startTime,
        endTime: data.endTime instanceof Date ? Timestamp.fromDate(data.endTime) : data.endTime,
      };
      if (editingSession) {
        await updateDocument(collectionPath, editingSession.id, firestoreData);
      } else {
        await addDocument(collectionPath, firestoreData);
      }
      setSubmitStatus("success");
    } catch (err) {
      setSubmitStatus("error");
      toast.error("Failed to save session");
      console.error(err);
    }
  }

  async function handleDelete() {
    if (!deletingSessionId || !collectionPath) return;
    try {
      await deleteDocument(collectionPath, deletingSessionId);
      toast.success("Session deleted");
    } catch (err) {
      toast.error("Failed to delete session");
      console.error(err);
    } finally {
      setDeletingSessionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">Manage talks, workshops, and panels</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          Add Session
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <SessionsTable
          sessions={sessions}
          onEdit={handleEdit}
          onDelete={(id) => setDeletingSessionId(id)}
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingSession ? "Edit Session" : "New Session"}</SheetTitle>
            <SheetDescription>
              {editingSession ? "Update the session details." : "Add a new session."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <SessionForm
              defaultValues={editingSession ? {
                title: editingSession.title,
                description: editingSession.description ?? null,
                startTime: editingSession.startTime?.toDate(),
                endTime: editingSession.endTime?.toDate(),
                location: editingSession.location ?? null,
                type: editingSession.type,
                speakerName: editingSession.speakerName ?? null,
                speakerBio: editingSession.speakerBio ?? null,
                requiresAccess: editingSession.requiresAccess,
                accessTier: editingSession.accessTier ?? null,
              } : undefined}
              onSubmit={handleSubmit}
              onCancel={() => setSheetOpen(false)}
              submitStatus={submitStatus}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingSessionId} onOpenChange={(open) => !open && setDeletingSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
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
