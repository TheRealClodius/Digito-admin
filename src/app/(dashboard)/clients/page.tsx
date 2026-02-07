"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection } from "@/hooks/use-collection";
import type { Client } from "@/types/client";

export default function ClientsPage() {
  const { data: clients, loading } = useCollection<Client & { id: string }>({
    path: "clients",
    orderByField: "name",
    orderDirection: "asc",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client organizations
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          New Client
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed">
          <p className="text-muted-foreground">No clients yet</p>
          <Button variant="outline" className="mt-4">
            <Plus className="mr-2 size-4" />
            Add your first client
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          {/* DataTable will be implemented here */}
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              {clients.length} client(s) found
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
