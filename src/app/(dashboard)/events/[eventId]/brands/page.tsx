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
import { BrandsTable } from "@/components/tables/brands-table";
import { BrandForm } from "@/components/forms/brand-form";
import type { Brand } from "@/types/brand";

export default function BrandsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { selectedClientId } = useEventContext();
  const collectionPath = selectedClientId
    ? `clients/${selectedClientId}/events/${eventId}/brands`
    : "";

  const { data: brands, loading } = useCollection<Brand>({
    path: collectionPath,
    orderByField: "name",
    orderDirection: "asc",
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleNew() { setEditingBrand(null); setSheetOpen(true); }
  function handleEdit(brand: Brand) { setEditingBrand(brand); setSheetOpen(true); }

  async function handleSubmit(data: Record<string, unknown>) {
    if (!collectionPath) return;
    setIsSubmitting(true);
    try {
      if (editingBrand) {
        await updateDocument(collectionPath, editingBrand.id, data);
        toast.success("Brand updated");
      } else {
        await addDocument(collectionPath, data);
        toast.success("Brand created");
      }
      setSheetOpen(false);
      setEditingBrand(null);
    } catch (err) {
      toast.error("Failed to save brand");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleHighlighted(brandId: string, isHighlighted: boolean) {
    if (!collectionPath) return;
    try {
      await updateDocument(collectionPath, brandId, { isHighlighted });
      toast.success(isHighlighted ? "Brand highlighted" : "Brand unhighlighted");
    } catch (err) {
      toast.error("Failed to update brand");
      console.error(err);
    }
  }

  async function handleDelete() {
    if (!deletingBrandId || !collectionPath) return;
    try {
      await deleteDocument(collectionPath, deletingBrandId);
      toast.success("Brand deleted");
    } catch (err) {
      toast.error("Failed to delete brand");
      console.error(err);
    } finally {
      setDeletingBrandId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Brands</h1>
          <p className="text-muted-foreground">Manage brands for this event</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          Add Brand
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <BrandsTable
          brands={brands}
          onEdit={handleEdit}
          onDelete={(id) => setDeletingBrandId(id)}
          onToggleHighlighted={handleToggleHighlighted}
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingBrand ? "Edit Brand" : "New Brand"}</SheetTitle>
            <SheetDescription>
              {editingBrand ? "Update the brand details." : "Add a new brand to this event."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <BrandForm
              defaultValues={editingBrand ? {
                name: editingBrand.name,
                description: editingBrand.description ?? null,
                logoUrl: editingBrand.logoUrl ?? null,
                imageUrl: editingBrand.imageUrl ?? null,

                websiteUrl: editingBrand.websiteUrl ?? null,
                instagramUrl: editingBrand.instagramUrl ?? null,
                stallNumber: editingBrand.stallNumber ?? null,
                isHighlighted: editingBrand.isHighlighted,
              } : undefined}
              onSubmit={handleSubmit}
              onCancel={() => setSheetOpen(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingBrandId} onOpenChange={(open) => !open && setDeletingBrandId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
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
