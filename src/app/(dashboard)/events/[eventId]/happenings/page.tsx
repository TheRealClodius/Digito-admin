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
import { HappeningsTable } from "@/components/tables/happenings-table";
import { HappeningForm } from "@/components/forms/happening-form";
import type { Happening } from "@/types/happening";

export default function HappeningsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/happenings`
    : "";

  const { data: happenings, loading } = useCollection<Happening>({
    path: collectionPath,
    orderByField: "startTime",
    orderDirection: "asc",
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingHappening, setEditingHappening] = useState<Happening | null>(null);
  const [deletingHappeningId, setDeletingHappeningId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleNew() { setEditingHappening(null); setSheetOpen(true); }
  function handleEdit(happening: Happening) { setEditingHappening(happening); setSheetOpen(true); }

  async function handleSubmit(data: Record<string, unknown>) {
    if (!collectionPath) return;
    setIsSubmitting(true);
    try {
      const firestoreData = {
        ...data,
        startTime: data.startTime instanceof Date ? Timestamp.fromDate(data.startTime) : data.startTime,
        endTime: data.endTime instanceof Date ? Timestamp.fromDate(data.endTime) : data.endTime,
      };
      if (editingHappening) {
        await updateDocument(collectionPath, editingHappening.id, firestoreData);
        toast.success("Happening updated");
      } else {
        await addDocument(collectionPath, firestoreData);
        toast.success("Happening created");
      }
      setSheetOpen(false);
      setEditingHappening(null);
    } catch (err) {
      toast.error("Failed to save happening");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingHappeningId || !collectionPath) return;
    try {
      await deleteDocument(collectionPath, deletingHappeningId);
      toast.success("Happening deleted");
    } catch (err) {
      toast.error("Failed to delete happening");
      console.error(err);
    } finally {
      setDeletingHappeningId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Happenings</h1>
          <p className="text-muted-foreground">Manage demos, performances, and activations</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          Add Happening
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <HappeningsTable
          happenings={happenings}
          onEdit={handleEdit}
          onDelete={(id) => setDeletingHappeningId(id)}
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingHappening ? "Edit Happening" : "New Happening"}</SheetTitle>
            <SheetDescription>
              {editingHappening ? "Update the happening details." : "Add a new happening."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <HappeningForm
              defaultValues={editingHappening ? {
                title: editingHappening.title,
                description: editingHappening.description ?? null,
                startTime: editingHappening.startTime?.toDate(),
                endTime: editingHappening.endTime?.toDate(),
                location: editingHappening.location ?? null,
                type: editingHappening.type,
                hostName: editingHappening.hostName ?? null,
                isHighlighted: editingHappening.isHighlighted,
                requiresAccess: editingHappening.requiresAccess,
              } : undefined}
              onSubmit={handleSubmit}
              onCancel={() => setSheetOpen(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingHappeningId} onOpenChange={(open) => !open && setDeletingHappeningId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Happening</AlertDialogTitle>
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
