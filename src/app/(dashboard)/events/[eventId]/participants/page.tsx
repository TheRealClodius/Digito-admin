"use client";

import { use, useState } from "react";
import { Plus } from "lucide-react";
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
import { ParticipantsTable } from "@/components/tables/participants-table";
import { ParticipantForm } from "@/components/forms/participant-form";
import type { Participant } from "@/types/participant";

export default function ParticipantsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/participants`
    : "";

  const { data: participants, loading } = useCollection<Participant>({
    path: collectionPath,
    orderByField: "lastName",
    orderDirection: "asc",
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  function handleNew() { setEditingParticipant(null); setSubmitStatus("idle"); setSheetOpen(true); }
  function handleEdit(participant: Participant) { setEditingParticipant(participant); setSubmitStatus("idle"); setSheetOpen(true); }

  async function handleSubmit(data: Record<string, unknown>) {
    if (!collectionPath) return;
    setSubmitStatus("saving");
    try {
      if (editingParticipant) {
        await updateDocument(collectionPath, editingParticipant.id, data);
      } else {
        await addDocument(collectionPath, data);
      }
      setSubmitStatus("success");
    } catch (err) {
      setSubmitStatus("error");
      toast.error("Failed to save participant");
      console.error(err);
    }
  }

  async function handleDelete() {
    if (!deletingParticipantId || !collectionPath) return;
    try {
      await deleteDocument(collectionPath, deletingParticipantId);
      toast.success("Participant deleted");
    } catch (err) {
      toast.error("Failed to delete participant");
      console.error(err);
    } finally {
      setDeletingParticipantId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Participants</h1>
          <p className="text-muted-foreground">Manage speakers, hosts, and representatives</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          Add Participant
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <ParticipantsTable
          participants={participants}
          onEdit={handleEdit}
          onDelete={(id) => setDeletingParticipantId(id)}
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingParticipant ? "Edit Participant" : "New Participant"}</SheetTitle>
            <SheetDescription>
              {editingParticipant ? "Update participant details." : "Add a new participant."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ParticipantForm
              defaultValues={editingParticipant ? {
                firstName: editingParticipant.firstName,
                lastName: editingParticipant.lastName,
                email: editingParticipant.email ?? null,
                role: editingParticipant.role,
                company: editingParticipant.company ?? null,
                title: editingParticipant.title ?? null,
                bio: editingParticipant.bio ?? null,
                avatarUrl: editingParticipant.avatarUrl ?? null,
                websiteUrl: editingParticipant.websiteUrl ?? null,
                linkedinUrl: editingParticipant.linkedinUrl ?? null,
                isHighlighted: editingParticipant.isHighlighted,
              } : undefined}
              onSubmit={handleSubmit}
              onCancel={() => setSheetOpen(false)}
              submitStatus={submitStatus}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingParticipantId} onOpenChange={(open) => !open && setDeletingParticipantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participant</AlertDialogTitle>
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
