"use client";

import { useEventContext } from "@/hooks/use-event-context";

export default function DashboardHome() {
  const { selectedClientId, selectedEventId, selectedClientName, selectedEventName } =
    useEventContext();

  if (!selectedClientId || !selectedEventId) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to Digito Admin</h1>
        <p className="text-muted-foreground">
          Select a client and event from the sidebar to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {selectedClientName} &mdash; {selectedEventName}
        </p>
      </div>
      <p className="text-muted-foreground">
        Navigate to a section from the sidebar to manage event content.
      </p>
    </div>
  );
}
