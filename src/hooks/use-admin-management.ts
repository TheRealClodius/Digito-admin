"use client";

import { useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCollection } from "@/hooks/use-collection";
import type { UserPermissions } from "@/types/permissions";

interface AddAdminParams {
  email: string;
  role: "clientAdmin" | "eventAdmin";
  clientIds: string[];
  eventIds?: string[];
}

export function useAdminManagement() {
  const { user } = useAuth();

  const { data: admins, loading, error } = useCollection<UserPermissions & { id: string }>({
    path: "userPermissions",
    orderByField: "email",
    orderDirection: "asc",
  });

  const getToken = useCallback(async () => {
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  }, [user]);

  const addAdmin = useCallback(
    async (params: AddAdminParams) => {
      const token = await getToken();
      const res = await fetch("/api/set-user-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add admin");
      }

      return res.json();
    },
    [getToken]
  );

  const removeAdmin = useCallback(
    async (userId: string) => {
      const token = await getToken();
      const res = await fetch("/api/remove-user-role", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove admin");
      }

      return res.json();
    },
    [getToken]
  );

  return { admins, loading, error, addAdmin, removeAdmin };
}
