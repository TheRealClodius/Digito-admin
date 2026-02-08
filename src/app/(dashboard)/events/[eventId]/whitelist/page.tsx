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

import { useCrudPage } from "@/hooks/use-crud-page";
import { useEventContext } from "@/hooks/use-event-context";
import { addDocument, updateDocument, queryDocuments } from "@/lib/firestore";
import { WhitelistTable } from "@/components/tables/whitelist-table";
import { WhitelistForm } from "@/components/forms/whitelist-form";
import type { WhitelistEntry } from "@/types/whitelist-entry";

export default function WhitelistPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/whitelist`
    : "";

  const {
    data: entries,
    loading,
    sheetOpen,
    setSheetOpen,
    editingEntity: editingEntry,
    deletingEntityId: deletingEntryId,
    setDeletingEntityId: setDeletingEntryId,
    handleNew,
    handleEdit,
    handleDelete,
  } = useCrudPage<WhitelistEntry>({
    collectionPath,
    orderByField: "addedAt",
    orderDirection: "desc",
    entityName: "whitelist entry",
  });

  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  async function handleSubmit(data: Record<string, unknown>) {
    if (!collectionPath || !selectedClientId) return;
    setSubmitStatus("saving");
    try {
      if (editingEntry) {
        await updateDocument(collectionPath, editingEntry.id, data);
      } else {
        await addDocument(collectionPath, data);
      }

      // Sync locked fields to the matching user profile
      const lockedFields = data.lockedFields as string[] | undefined;
      if (lockedFields && lockedFields.length > 0) {
        const usersPath = `clients/${selectedClientId}/events/${eventId}/users`;
        const email = data.email as string;
        const matchingUsers = await queryDocuments(usersPath, "email", email);
        if (matchingUsers.length > 0) {
          const update: Record<string, unknown> = {};
          for (const field of lockedFields) {
            if (field in data) {
              update[field] = data[field];
            }
          }
          if (Object.keys(update).length > 0) {
            await updateDocument(usersPath, matchingUsers[0].id, update);
          }
        }
      }

      setSubmitStatus("success");
    } catch (err) {
      setSubmitStatus("error");
      toast.error("Failed to save whitelist entry");
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Whitelist</h1>
          <p className="text-muted-foreground">Manage pre-approved attendees</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          Add Entry
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <WhitelistTable
          entries={entries}
          onEdit={handleEdit}
          onDelete={(id) => setDeletingEntryId(id)}
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingEntry ? "Edit Entry" : "New Whitelist Entry"}</SheetTitle>
            <SheetDescription>
              {editingEntry ? "Update the whitelist entry." : "Add a new pre-approved attendee."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <WhitelistForm
              defaultValues={editingEntry ? {
                email: editingEntry.email,
                accessTier: editingEntry.accessTier,
                company: editingEntry.company ?? null,
                lockedFields: editingEntry.lockedFields ?? [],
              } : undefined}
              onSubmit={handleSubmit}
              onCancel={() => setSheetOpen(false)}
              submitStatus={submitStatus}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingEntryId} onOpenChange={(open) => !open && setDeletingEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Entry</AlertDialogTitle>
            <AlertDialogDescription>Remove this person from the whitelist?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
