"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { verifyPermissions } from "@/lib/auth";
import type { UserPermissions, UserRole } from "@/types/permissions";

interface PermissionsContextValue {
  role: UserRole | null;
  permissions: UserPermissions | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isClientAdmin: boolean;
  isEventAdmin: boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(
  undefined
);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  // Tracks which user UID we have resolved permissions for.
  // Lets us derive `loading` synchronously — no stale-state race condition.
  const [resolvedUid, setResolvedUid] = useState<string | null>(null);

  const loading =
    authLoading || (user != null && resolvedUid !== user.uid);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRole(null);
      setPermissions(null);
      setResolvedUid(null);
      return;
    }

    let cancelled = false;

    async function resolvePermissions() {
      try {
        const result = await verifyPermissions(user!);

        if (cancelled) return;

        if (result.role === "superadmin" && !result.permissions) {
          // Superadmins don't have a Firestore doc — synthesize one
          const syntheticPerms: UserPermissions = {
            userId: user!.uid,
            email: user!.email ?? "",
            role: "superadmin",
            clientIds: null,
            eventIds: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: user!.uid,
            updatedBy: user!.uid,
          };
          setRole("superadmin");
          setPermissions(syntheticPerms);
        } else {
          setRole(result.role);
          setPermissions(result.permissions);
        }
        setResolvedUid(user!.uid);
      } catch {
        if (!cancelled) {
          setRole(null);
          setPermissions(null);
          setResolvedUid(user!.uid);
        }
      }
    }

    resolvePermissions();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return (
    <PermissionsContext.Provider
      value={{
        role,
        permissions,
        loading,
        isSuperAdmin: role === "superadmin",
        isClientAdmin: role === "clientAdmin",
        isEventAdmin: role === "eventAdmin",
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error(
      "usePermissions must be used within PermissionsProvider"
    );
  }
  return context;
}
