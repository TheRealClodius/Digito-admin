"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { checkUserRole, getUserPermissions } from "@/lib/auth";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRole(null);
      setPermissions(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function resolvePermissions() {
      try {
        // Step 1: Check custom claims for role
        const claimRole = await checkUserRole(user!);

        if (cancelled) return;

        if (claimRole === "superadmin") {
          // Superadmins don't need a Firestore read for scoping
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
          setLoading(false);
          return;
        }

        if (claimRole) {
          // ClientAdmin or EventAdmin — fetch scoping from Firestore
          const perms = await getUserPermissions(user!.uid);
          if (cancelled) return;
          setRole(claimRole);
          setPermissions(perms);
          setLoading(false);
          return;
        }

        // Step 2: No claims found — fallback to Firestore
        const perms = await getUserPermissions(user!.uid);
        if (cancelled) return;

        if (perms) {
          setRole(perms.role);
          setPermissions(perms);
        } else {
          setRole(null);
          setPermissions(null);
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          setRole(null);
          setPermissions(null);
          setLoading(false);
        }
      }
    }

    setLoading(true);
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
