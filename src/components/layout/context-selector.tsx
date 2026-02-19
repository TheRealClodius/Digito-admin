"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Option, Plus } from "lucide-react";
import { useEventContext } from "@/hooks/use-event-context";
import { useApiCollection } from "@/hooks/use-api-collection";
import { usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/hooks/use-translation";
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

  // API routes filter by permissions server-side
  const { data: clients } = useApiCollection<Client & { id: string }>({
    apiPath: "/api/clients",
    queryKey: ["clients"],
  });

  const { data: allEvents } = useApiCollection<Event & { id: string; eventCode: string }>({
    apiPath: selectedClientId
      ? `/api/clients/${selectedClientId}/events`
      : "",
    queryKey: ["clients", selectedClientId ?? "", "events"],
    enabled: !!selectedClientId,
  });

  // Filter events for eventAdmins (null eventCodes = full access)
  const events = useMemo(() => {
    if (!permissions?.eventCodes) return allEvents;
    return allEvents.filter((e) => permissions.eventCodes!.includes(e.eventCode));
  }, [allEvents, permissions?.eventCodes]);

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
                  key={event.eventCode}
                  onClick={() => setSelectedEvent(event.eventCode, event.name)}
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
              onEventCreated={(eventCode, name) => setSelectedEvent(eventCode, name)}
            />
          )}
        </div>
      )}
    </div>
  );
}
