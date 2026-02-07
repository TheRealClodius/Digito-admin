"use client";

import { ChevronDown } from "lucide-react";
import { useEventContext } from "@/hooks/use-event-context";
import { useCollection } from "@/hooks/use-collection";
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
    selectedEventId,
    selectedClientName,
    selectedEventName,
    setSelectedClient,
    setSelectedEvent,
  } = useEventContext();

  const { data: clients } = useCollection<Client & { id: string }>({
    path: "clients",
    orderByField: "name",
    orderDirection: "asc",
  });

  const { data: events } = useCollection<Event & { id: string }>({
    path: selectedClientId
      ? `clients/${selectedClientId}/events`
      : "",
    orderByField: "name",
    orderDirection: "asc",
  });

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between text-xs">
            <span className="truncate">
              {selectedClientName || "Select Client"}
            </span>
            <ChevronDown className="size-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Clients</DropdownMenuLabel>
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
            <DropdownMenuItem disabled>No clients found</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedClientId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between text-xs">
              <span className="truncate">
                {selectedEventName || "Select Event"}
              </span>
              <ChevronDown className="size-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Events</DropdownMenuLabel>
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
              <DropdownMenuItem disabled>No events found</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
