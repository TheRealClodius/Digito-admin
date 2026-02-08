"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { EventContextProvider } from "@/contexts/event-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <EventContextProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </EventContextProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
