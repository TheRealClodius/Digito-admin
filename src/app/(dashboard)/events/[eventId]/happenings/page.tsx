"use client";

import { use } from "react";
import { Plus } from "lucide-react";
import { Timestamp } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { HappeningsTable } from "@/components/tables/happenings-table";
import { HappeningForm } from "@/components/forms/happening-form";
import type { Happening } from "@/types/happening";

const toTimestamp = (val: unknown): Timestamp | unknown => {
  if (val instanceof Date) return Timestamp.fromDate(val);
  if (typeof val === "string" && val) return Timestamp.fromDate(new Date(val));
  return val;
};

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

  const {
    data: happenings,
    loading,
    sheetOpen,
    setSheetOpen,
    editingEntity: editingHappening,
    deletingEntityId: deletingHappeningId,
    setDeletingEntityId: setDeletingHappeningId,
    submitStatus,
    handleNew,
    handleEdit,
    handleSubmit,
    handleDelete,
  } = useCrudPage<Happening>({
    collectionPath,
    orderByField: "startTime",
    orderDirection: "asc",
    entityName: "happening",
    dataTransformer: (data) => ({
      ...data,
      startTime: toTimestamp(data.startTime),
      endTime: toTimestamp(data.endTime),
    }),
  });

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
        <SheetContent className="overflow-y-auto">
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
              submitStatus={submitStatus}
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
