"use client";

import { Plus } from "lucide-react";

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

import { useCrudPage } from "@/hooks/use-crud-page";
import { deleteClientCascade } from "@/lib/firestore";
import { ClientsTable } from "@/components/tables/clients-table";
import { ClientForm } from "@/components/forms/client-form";
import type { Client } from "@/types/client";

export default function ClientsPage() {
  const {
    data: clients,
    loading,
    sheetOpen,
    setSheetOpen,
    editingEntity: editingClient,
    deletingEntityId: deletingClientId,
    setDeletingEntityId: setDeletingClientId,
    submitStatus,
    handleNew,
    handleEdit,
    handleSubmit,
    handleDelete,
  } = useCrudPage<Client>({
    collectionPath: "clients",
    orderByField: "name",
    orderDirection: "asc",
    entityName: "client",
    onDelete: (id) => deleteClientCascade(id),
  });

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
              storagePath="clients"
            />
          </div>
        </SheetContent>
      </Sheet>

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
