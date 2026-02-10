import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorBanner } from "@/components/error-banner";
import { AISuggestionProvider } from "@/contexts/ai-suggestion-context";

interface CrudPageProps<T> {
  // Header
  title: string;
  description: string;
  addButtonLabel: string;
  entityName: string;
  renderHeaderExtra?: () => ReactNode;

  // Data state (from useCrudPage)
  data: T[];
  loading: boolean;
  error: Error | null;

  // Sheet state
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  editingEntity: T | null;
  submitStatus: "idle" | "saving" | "success" | "error";

  // Delete state
  deletingEntityId: string | null;
  setDeletingEntityId: (id: string | null) => void;

  // Handlers
  handleNew: () => void;
  handleEdit: (entity: T) => void;
  handleSubmit: (data: Record<string, unknown>) => Promise<void>;
  handleDelete: () => Promise<void>;

  // Render props
  renderTable: (data: T[], onEdit: (entity: T) => void, onDelete: (id: string) => void) => ReactNode;
  renderForm: (props: {
    editingEntity: T | null;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    onCancel: () => void;
    submitStatus: "idle" | "saving" | "success" | "error";
  }) => ReactNode;

  // Optional customization
  readOnly?: boolean;
  editDescription?: string;
  newDescription?: string;
  deleteTitle?: string;
  deleteDescription?: string;
  deleteActionLabel?: string;
}

export function CrudPage<T extends { id: string }>({
  title,
  description,
  addButtonLabel,
  entityName,
  renderHeaderExtra,
  data,
  loading,
  error,
  sheetOpen,
  setSheetOpen,
  editingEntity,
  submitStatus,
  deletingEntityId,
  setDeletingEntityId,
  handleNew,
  handleEdit,
  handleSubmit,
  handleDelete,
  renderTable,
  renderForm,
  readOnly = false,
  editDescription,
  newDescription,
  deleteTitle,
  deleteDescription,
  deleteActionLabel,
}: CrudPageProps<T>) {
  const { t } = useTranslation();
  const capitalizedName = entityName.charAt(0).toUpperCase() + entityName.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {renderHeaderExtra?.()}
          {!readOnly && (
            <Button onClick={handleNew}>
              <Plus className="size-4" />
              {addButtonLabel}
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <ErrorBanner error={error} />
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        renderTable(
          data,
          readOnly ? () => {} : handleEdit,
          readOnly ? () => {} : (id) => setDeletingEntityId(id)
        )
      )}

      <AISuggestionProvider>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {editingEntity ? t("crud.editEntity", { entity: capitalizedName }) : t("crud.newEntity", { entity: capitalizedName })}
              </SheetTitle>
              <SheetDescription>
                {editingEntity
                  ? (editDescription ?? t("crud.updateDescription", { entity: entityName }))
                  : (newDescription ?? t("crud.addDescription", { entity: entityName }))}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {renderForm({
                editingEntity,
                onSubmit: handleSubmit,
                onCancel: () => setSheetOpen(false),
                submitStatus,
              })}
            </div>
          </SheetContent>
        </Sheet>
      </AISuggestionProvider>

      <AlertDialog
        open={!!deletingEntityId}
        onOpenChange={(open) => !open && setDeletingEntityId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTitle ?? t("crud.deleteEntity", { entity: capitalizedName })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDescription ?? t("crud.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {deleteActionLabel ?? t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
