"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useApiCollection } from "@/hooks/use-api-collection";
import type { UserPermissions } from "@/types/permissions";

interface AddAdminParams {
  email: string;
  role: "clientAdmin" | "eventAdmin";
  clientIds: string[];
  eventCodes?: string[];
}

export function useAdminManagement() {
  const queryClient = useQueryClient();

  const { data: admins, loading, error } = useApiCollection<UserPermissions & { id: string }>({
    apiPath: "/api/admin/users",
    queryKey: ["admin-users"],
  });

  const addAdmin = useCallback(
    async (params: AddAdminParams) => {
      const result = await apiFetch("/api/set-user-role", {
        method: "POST",
        body: params,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      return result;
    },
    [queryClient]
  );

  const removeAdmin = useCallback(
    async (userId: string) => {
      const result = await apiFetch("/api/remove-user-role", {
        method: "DELETE",
        body: { userId },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      return result;
    },
    [queryClient]
  );

  return { admins, loading, error, addAdmin, removeAdmin };
}
