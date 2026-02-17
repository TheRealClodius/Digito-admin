"use client";

import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/auth-context";
import { PermissionsProvider } from "@/contexts/permissions-context";
import { LanguageProvider } from "@/contexts/language-context";
import { EventContextProvider } from "@/contexts/event-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient instance (useState ensures it's created only once per component lifecycle)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: data is considered fresh for 30 seconds
            staleTime: 30 * 1000,
            // Cache time: unused data stays in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
            // Don't refetch on window focus by default (can be overridden per query)
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionsProvider>
          <LanguageProvider>
            <ThemeProvider>
              <EventContextProvider>
                <TooltipProvider>{children}</TooltipProvider>
              </EventContextProvider>
            </ThemeProvider>
          </LanguageProvider>
        </PermissionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
