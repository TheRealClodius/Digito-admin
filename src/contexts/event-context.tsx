"use client";

import { createContext, useState, useCallback, type ReactNode } from "react";

interface EventContextType {
  selectedClientId: string | null;
  selectedEventId: string | null;
  selectedClientName: string | null;
  selectedEventName: string | null;
  setSelectedClient: (id: string | null, name?: string | null) => void;
  setSelectedEvent: (id: string | null, name?: string | null) => void;
  clearSelection: () => void;
}

export const EventContext = createContext<EventContextType | null>(null);

export function EventContextProvider({ children }: { children: ReactNode }) {
  const [selectedClientId, setClientId] = useState<string | null>(null);
  const [selectedEventId, setEventId] = useState<string | null>(null);
  const [selectedClientName, setClientName] = useState<string | null>(null);
  const [selectedEventName, setEventName] = useState<string | null>(null);

  const setSelectedClient = useCallback((id: string | null, name?: string | null) => {
    setClientId(id);
    setClientName(name ?? null);
    // Reset event when client changes
    setEventId(null);
    setEventName(null);
  }, []);

  const setSelectedEvent = useCallback((id: string | null, name?: string | null) => {
    setEventId(id);
    setEventName(name ?? null);
  }, []);

  const clearSelection = useCallback(() => {
    setClientId(null);
    setEventId(null);
    setClientName(null);
    setEventName(null);
  }, []);

  return (
    <EventContext.Provider
      value={{
        selectedClientId,
        selectedEventId,
        selectedClientName,
        selectedEventName,
        setSelectedClient,
        setSelectedEvent,
        clearSelection,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}
