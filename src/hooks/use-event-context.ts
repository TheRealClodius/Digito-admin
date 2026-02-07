"use client";

import { useContext } from "react";
import { EventContext } from "@/contexts/event-context";

export function useEventContext() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEventContext must be used within an EventContextProvider");
  }
  return context;
}
