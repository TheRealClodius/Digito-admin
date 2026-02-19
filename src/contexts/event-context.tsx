"use client";

import { createContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface EventContextType {
  selectedClientId: string | null;
  selectedEventCode: string | null;
  selectedClientName: string | null;
  selectedEventName: string | null;
  setSelectedClient: (id: string | null, name?: string | null) => void;
  setSelectedEvent: (eventCode: string | null, name?: string | null) => void;
  clearSelection: () => void;
}

export const EventContext = createContext<EventContextType | null>(null);

// Helper to safely get from sessionStorage
function getSessionItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(key);
}

// Helper to safely set to sessionStorage
function setSessionItem(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  if (value === null) {
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, value);
  }
}

export function EventContextProvider({ children }: { children: ReactNode }) {
  const [selectedClientId, setClientId] = useState<string | null>(null);
  const [selectedEventCode, setEventId] = useState<string | null>(null);
  const [selectedClientName, setClientName] = useState<string | null>(null);
  const [selectedEventName, setEventName] = useState<string | null>(null);

  // Initialize from sessionStorage on mount (client-side only)
  useEffect(() => {
    setClientId(getSessionItem("selectedClientId"));
    setEventId(getSessionItem("selectedEventCode"));
    setClientName(getSessionItem("selectedClientName"));
    setEventName(getSessionItem("selectedEventName"));
  }, []);

  const setSelectedClient = useCallback((id: string | null, name?: string | null) => {
    setClientId(id);
    setClientName(name ?? null);
    setSessionItem("selectedClientId", id);
    setSessionItem("selectedClientName", name ?? null);
    // Reset event when client changes
    setEventId(null);
    setEventName(null);
    setSessionItem("selectedEventCode", null);
    setSessionItem("selectedEventName", null);
  }, []);

  const setSelectedEvent = useCallback((eventCode: string | null, name?: string | null) => {
    setEventId(eventCode);
    setEventName(name ?? null);
    setSessionItem("selectedEventCode", eventCode);
    setSessionItem("selectedEventName", name ?? null);
  }, []);

  const clearSelection = useCallback(() => {
    setClientId(null);
    setEventId(null);
    setClientName(null);
    setEventName(null);
    setSessionItem("selectedClientId", null);
    setSessionItem("selectedEventCode", null);
    setSessionItem("selectedClientName", null);
    setSessionItem("selectedEventName", null);
  }, []);

  return (
    <EventContext.Provider
      value={{
        selectedClientId,
        selectedEventCode,
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
