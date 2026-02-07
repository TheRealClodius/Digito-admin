"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { EventContextProvider } from "@/contexts/event-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <EventContextProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </EventContextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
