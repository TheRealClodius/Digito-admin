"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SubmitStatus = "idle" | "saving" | "success" | "error";

interface AdminFormProps {
  clients: { id: string; name: string }[];
  onSubmit: (data: {
    email: string;
    role: "clientAdmin" | "eventAdmin";
    clientIds: string[];
    eventIds?: string[];
  }) => void;
  onCancel: () => void;
  submitStatus?: SubmitStatus;
  restrictToEventAdmin?: boolean;
}

export function AdminForm({
  clients,
  onSubmit,
  onCancel,
  submitStatus = "idle",
  restrictToEventAdmin = false,
}: AdminFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"clientAdmin" | "eventAdmin">(
    restrictToEventAdmin ? "eventAdmin" : "clientAdmin"
  );
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const isSubmitting = submitStatus === "saving";
  const isValid = email.trim().length > 0 && selectedClientIds.length > 0;

  function toggleClient(clientId: string) {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    onSubmit({
      email: email.trim().toLowerCase(),
      role,
      clientIds: selectedClientIds,
    });
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="space-y-3">
        <Label htmlFor="admin-email">{t("common.email")}</Label>
        <Input
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("settings.adminEmailPlaceholder")}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="admin-role">{t("participants.role")}</Label>
        <select
          id="admin-role"
          value={role}
          onChange={(e) => setRole(e.target.value as "clientAdmin" | "eventAdmin")}
          disabled={isSubmitting || restrictToEventAdmin}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!restrictToEventAdmin && (
            <option value="clientAdmin">{t("settings.clientAdmin")}</option>
          )}
          <option value="eventAdmin">{t("settings.eventAdmin")}</option>
        </select>
      </div>

      <div className="space-y-3">
        <Label>{t("clients.title")}</Label>
        <div className="space-y-2 rounded-md border p-3">
          {clients.map((client) => (
            <div key={client.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`client-${client.id}`}
                checked={selectedClientIds.includes(client.id)}
                onChange={() => toggleClient(client.id)}
                disabled={isSubmitting}
                aria-label={client.name}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor={`client-${client.id}`} className="font-normal">
                {client.name}
              </Label>
            </div>
          ))}
          {clients.length === 0 && (
            <p className="text-sm text-muted-foreground">No clients available</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? t("common.saving") : t("settings.addAdmin")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        {submitStatus === "success" && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="size-4" />
            Added
          </span>
        )}
        {submitStatus === "error" && (
          <p className="text-sm text-destructive">Failed to add admin</p>
        )}
      </div>
    </form>
  );
}
