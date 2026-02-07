"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { ClientsTable } from "@/components/tables/clients-table";
import { ClientForm } from "@/components/forms/client-form";
import type { Client } from "@/types/client";

export default function ClientsPage() {
  const { data: clients, loading } = useCollection<Client>({
    path: "clients",
    orderByField: "name",
    orderDirection: "asc",
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  function handleNew() {
    setEditingClient(null);
    setSubmitStatus("idle");
    setSheetOpen(true);
  }

  function handleEdit(client: Client) {
    setEditingClient(client);
    setSubmitStatus("idle");
    setSheetOpen(true);
  }

  async function handleSubmit(data: { name: string; description?: string | null; logoUrl?: string | null }) {
    setSubmitStatus("saving");
    try {
      if (editingClient) {
        await updateDocument("clients", editingClient.id, data);
      } else {
        await addDocument("clients", data);
      }
      setSubmitStatus("success");
    } catch (err) {
      setSubmitStatus("error");
      toast.error("Failed to save client");
      console.error(err);
    }
  }

  async function handleDelete() {
    if (!deletingClientId) return;
    try {
      await deleteDocument("clients", deletingClientId);
      toast.success("Client deleted");
    } catch (err) {
      toast.error("Failed to delete client");
      console.error(err);
    } finally {
      setDeletingClientId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client organizations
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          New Client
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <ClientsTable
          clients={clients}
          onEdit={handleEdit}
          onDelete={(id) => setDeletingClientId(id)}
        />
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingClient ? "Edit Client" : "New Client"}</SheetTitle>
            <SheetDescription>
              {editingClient
                ? "Update the client details below."
                : "Fill in the details to create a new client."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ClientForm
              defaultValues={
                editingClient
                  ? {
                      name: editingClient.name,
                      description: editingClient.description ?? null,
                      logoUrl: editingClient.logoUrl ?? null,
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
        open={!!deletingClientId}
        onOpenChange={(open) => !open && setDeletingClientId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be
              undone and will also remove all events under this client.
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
