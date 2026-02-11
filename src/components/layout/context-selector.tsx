"use client";

import { useEffect, useMemo, useState } from "react";
import { where, documentId } from "firebase/firestore";
import { ChevronDown, Option, Plus } from "lucide-react";
import { useEventContext } from "@/hooks/use-event-context";
import { useCollection } from "@/hooks/use-collection";
import { usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateEventDialog } from "./create-event-dialog";
import type { Client } from "@/types/client";
import type { Event } from "@/types/event";

export function ContextSelector() {
  const {
    selectedClientId,
    selectedClientName,
    selectedEventName,
    setSelectedClient,
    setSelectedEvent,
  } = useEventContext();
  const { permissions, isSuperAdmin, isClientAdmin } = usePermissions();
  const { t } = useTranslation();
  const canCreateEvent = isSuperAdmin || isClientAdmin;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Non-superadmins: scope the clients query to their assigned clientIds
  // so Firestore security rules allow the list query.
  const clientConstraints = useMemo(() => {
    if (isSuperAdmin || !permissions?.clientIds?.length) return [];
    return [where(documentId(), "in", permissions.clientIds)];
  }, [isSuperAdmin, permissions?.clientIds]);

  const clientConstraintsKey = useMemo(() => {
    if (isSuperAdmin || !permissions?.clientIds?.length) return "";
    return permissions.clientIds.join(",");
  }, [isSuperAdmin, permissions?.clientIds]);

  const { data: allClients } = useCollection<Client & { id: string }>({
    path: "clients",
    orderByField: "name",
    orderDirection: "asc",
    constraints: clientConstraints,
    constraintsKey: clientConstraintsKey,
  });

  const { data: allEvents } = useCollection<Event & { id: string }>({
    path: selectedClientId
      ? `clients/${selectedClientId}/events`
      : "",
    orderByField: "name",
    orderDirection: "asc",
  });

  // Filter clients by permissions scope (null clientIds = full access)
  const clients = useMemo(() => {
    if (!permissions?.clientIds) return allClients;
    return allClients.filter((c) => permissions.clientIds!.includes(c.id));
  }, [allClients, permissions?.clientIds]);

  // Filter events for eventAdmins (null eventIds = full access)
  const events = useMemo(() => {
    if (!permissions?.eventIds) return allEvents;
    return allEvents.filter((e) => permissions.eventIds!.includes(e.id));
  }, [allEvents, permissions?.eventIds]);

  // Auto-select first available client for non-SuperAdmins
  useEffect(() => {
    if (isSuperAdmin || selectedClientId || clients.length === 0) return;
    setSelectedClient(clients[0].id, clients[0].name);
  }, [isSuperAdmin, selectedClientId, clients, setSelectedClient]);

  return (
    <div className="flex flex-col gap-2">
      {isSuperAdmin && (
        <div className="flex flex-col gap-1">
          <label className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("contextSelector.clientLabel")}
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-xs">
                <span className="truncate">
                  {selectedClientName || t("contextSelector.selectClient")}
                </span>
                <ChevronDown className="size-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>{t("contextSelector.clients")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {clients.map((client) => (
                <DropdownMenuItem
                  key={client.id}
                  onClick={() => setSelectedClient(client.id, client.name)}
                >
                  {client.name}
                </DropdownMenuItem>
              ))}
              {clients.length === 0 && (
                <DropdownMenuItem disabled>{t("contextSelector.noClientsFound")}</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {selectedClientId && (
        <div className="flex flex-col gap-1">
          <label className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("contextSelector.eventLabel")}
          </label>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <>
                <div className="w-0.5 shrink-0" aria-hidden />
                <Option className="size-4 shrink-0 text-muted-foreground" aria-hidden data-testid="event-dropdown-option-icon" />
              </>
            )}
            <div className="min-w-0 flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between text-xs">
                  <span className="truncate">
                    {selectedEventName || t("contextSelector.selectEvent")}
                  </span>
                  <ChevronDown className="size-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>{t("contextSelector.events")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {events.map((event) => (
                <DropdownMenuItem
                  key={event.id}
                  onClick={() => setSelectedEvent(event.id, event.name)}
                >
                  {event.name}
                </DropdownMenuItem>
              ))}
              {events.length === 0 && (
                <DropdownMenuItem disabled>{t("contextSelector.noEventsFound")}</DropdownMenuItem>
              )}
              {canCreateEvent && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCreateDialogOpen(true)} className="gap-2">
                    <Plus className="size-3.5 text-accent-alternate" />
                    {t("contextSelector.newEvent")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
            </div>
          </div>
          {canCreateEvent && (
            <CreateEventDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              clientId={selectedClientId}
              onEventCreated={(id, name) => setSelectedEvent(id, name)}
            />
          )}
        </div>
      )}
    </div>
  );
}
