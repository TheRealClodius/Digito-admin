"use client";

import { useState } from "react";
import { Trash2, Plus, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/contexts/theme-context";
import { useTranslation } from "@/hooks/use-translation";
import { usePermissions } from "@/hooks/use-permissions";
import { useAdminManagement } from "@/hooks/use-admin-management";
import { useCollection } from "@/hooks/use-collection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminForm } from "@/components/forms/admin-form";
import type { Client } from "@/types/client";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  const { isSuperAdmin } = usePermissions();
  const { admins, loading: adminsLoading, addAdmin, removeAdmin } = useAdminManagement();

  const { data: clients } = useCollection<Client & { id: string }>({
    path: "clients",
    orderByField: "name",
    orderDirection: "asc",
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAddAdmin(data: {
    email: string;
    role: "clientAdmin" | "eventAdmin";
    clientIds: string[];
    eventIds?: string[];
  }) {
    setSubmitStatus("saving");
    try {
      await addAdmin(data);
      setSubmitStatus("success");
      toast.success(`Admin role assigned to ${data.email}`);
      setTimeout(() => {
        setSheetOpen(false);
        setSubmitStatus("idle");
      }, 1000);
    } catch (err) {
      setSubmitStatus("error");
      toast.error(err instanceof Error ? err.message : "Failed to add admin");
    }
  }

  async function handleRemoveAdmin() {
    if (!removingId) return;
    try {
      await removeAdmin(removingId);
      toast.success("Admin role removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove admin");
    } finally {
      setRemovingId(null);
    }
  }

  const roleBadgeColor: Record<string, string> = {
    superadmin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    clientAdmin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    eventAdmin: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.accountInfo")}</CardTitle>
          <CardDescription>{t("settings.accountDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">{t("common.email")}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium">{t("settings.uid")}</p>
            <p className="text-sm text-muted-foreground">{user?.uid}</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.appearance")}</CardTitle>
          <CardDescription>{t("settings.appearanceDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={themeMode} onValueChange={setThemeMode}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light">{t("settings.light")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark">{t("settings.dark")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto">
                {t("settings.auto", { theme: t(theme === "light" ? "settings.light" : "settings.dark").toLowerCase() })}
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
          <CardDescription>{t("settings.languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={language} onValueChange={(val) => setLanguage(val as "en" | "it")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en" id="lang-en" />
              <Label htmlFor="lang-en">
                <span className="inline-flex items-center gap-2">🇬🇧 {t("settings.english")}</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="it" id="lang-it" />
              <Label htmlFor="lang-it">
                <span className="inline-flex items-center gap-2">🇮🇹 {t("settings.italian")}</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <>
          <Separator />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("settings.superAdmins")}</CardTitle>
                <CardDescription>
                  {t("settings.superAdminsDescription")}
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setSheetOpen(true)}>
                <Plus className="size-4" />
                Add Admin
              </Button>
            </CardHeader>
            <CardContent>
              {adminsLoading ? (
                <p className="text-sm text-muted-foreground">Loading admins...</p>
              ) : admins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No admins configured</p>
              ) : (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{admin.email}</p>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                                roleBadgeColor[admin.role] ?? "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {admin.role}
                            </span>
                            {admin.clientIds && admin.clientIds.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {admin.clientIds.length} client{admin.clientIds.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {admin.role !== "superadmin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemovingId(admin.id)}
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Admin</SheetTitle>
            <SheetDescription>
              Assign a role to a user. They must have signed in at least once.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <AdminForm
              clients={clients.map((c) => ({ id: c.id, name: c.name }))}
              onSubmit={handleAddAdmin}
              onCancel={() => setSheetOpen(false)}
              submitStatus={submitStatus}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!removingId}
        onOpenChange={(open) => !open && setRemovingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this admin&apos;s role? They will lose
              access to the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAdmin}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
