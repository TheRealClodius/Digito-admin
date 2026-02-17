"use client";

import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";

export default function DebugAuthPage() {
  const { user, loading: authLoading } = useAuth();
  const { role, permissions, loading: permissionsLoading } = usePermissions();
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);

  useEffect(() => {
    async function getTokenPreview() {
      if (!user) return;
      try {
        const token = await user.getToken();
        // Show first/last 20 chars for debugging
        if (token.length > 50) {
          setTokenPreview(`${token.slice(0, 20)}...${token.slice(-20)}`);
        } else {
          setTokenPreview(token);
        }
      } catch (error) {
        console.error("Error getting token:", error);
        setTokenPreview("Error getting token");
      }
    }
    getTokenPreview();
  }, [user]);

  async function handleForceSignOut() {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = "gg-session=; path=/; max-age=0";
    await signOut();
    window.location.href = "/login";
  }

  const loading = authLoading || permissionsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auth Debug</h1>
        <p className="text-muted-foreground">
          Check your Cognito session and MongoDB permissions
        </p>
      </div>

      <div className="rounded-md border p-6 space-y-6">
        {/* User Info */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Cognito User</h2>
          {loading ? (
            <p>Loading...</p>
          ) : user ? (
            <div className="space-y-1 text-sm">
              <p><strong>Sub:</strong> {user.sub}</p>
              <p><strong>Email:</strong> {user.email || "N/A"}</p>
              <p><strong>Access Token:</strong> <code className="text-xs bg-muted px-1 rounded">{tokenPreview || "..."}</code></p>
            </div>
          ) : (
            <p className="text-red-600">Not authenticated</p>
          )}
        </div>

        {/* Role & Permissions from MongoDB */}
        <div>
          <h2 className="text-lg font-semibold mb-2">MongoDB Permissions</h2>
          {loading ? (
            <p>Loading permissions...</p>
          ) : permissions ? (
            <div>
              <pre className="bg-muted p-4 rounded overflow-auto text-xs mb-2">
                {JSON.stringify(permissions, null, 2)}
              </pre>
              <div className="text-sm space-y-1">
                <p><strong>Role:</strong> {permissions.role}</p>
                <p>
                  <strong>Is Superadmin:</strong>{" "}
                  {role === "superadmin" ? (
                    <span className="text-green-600 font-bold">YES</span>
                  ) : (
                    <span className="text-red-600 font-bold">NO</span>
                  )}
                </p>
                <p>
                  <strong>Client Access:</strong>{" "}
                  {permissions.clientIds === null
                    ? "All clients"
                    : permissions.clientIds?.join(", ") || "None"}
                </p>
                <p>
                  <strong>Event Access:</strong>{" "}
                  {permissions.eventCodes === null
                    ? "All events"
                    : permissions.eventCodes?.join(", ") || "None"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-yellow-600">No permissions found in MongoDB</p>
          )}
        </div>

        {/* Actions */}
        <div className="pt-4 space-y-2">
          <Button onClick={handleForceSignOut} variant="destructive">
            Force Sign Out & Clear Session
          </Button>
        </div>
      </div>
    </div>
  );
}
