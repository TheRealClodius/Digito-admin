"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { signOut } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/error-boundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: permissionsLoading } = usePermissions();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarDetached, setSidebarDetached] = useState(false);

  // When collapsing: detach after height animation finishes (300ms)
  // When expanding: re-attach immediately so content makes room, then sidebar grows
  useEffect(() => {
    if (sidebarCollapsed) {
      const timer = setTimeout(() => setSidebarDetached(true), 300);
      return () => clearTimeout(timer);
    } else {
      setSidebarDetached(false);
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (authLoading || permissionsLoading) return;
    if (!user) {
      router.push("/login");
    } else if (!role) {
      signOut()
        .then(() => router.push("/unauthorized"))
        .catch(() => router.push("/unauthorized"));
    }
  }, [user, role, authLoading, permissionsLoading, router]);

  if (authLoading || permissionsLoading || !user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <div className="absolute inset-y-0 left-0 z-30 p-2">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden transition-[padding] duration-300 ease-in-out",
          sidebarDetached ? "pl-0" : "pl-[272px]"
        )}
      >
        <Header />
        <main className="flex-1 overflow-auto p-6 pt-20">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
