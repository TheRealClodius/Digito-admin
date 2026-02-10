"use client";

import { useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useEventContext } from "@/hooks/use-event-context";
import { useCollection } from "@/hooks/use-collection";
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
  const { permissions, isSuperAdmin } = usePermissions();
  const { t } = useTranslation();

  const { data: allClients } = useCollection<Client & { id: string }>({
    path: "clients",
    orderByField: "name",
    orderDirection: "asc",
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
      )}

      {selectedClientId && (
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
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
