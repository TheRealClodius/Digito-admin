"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut, getUserPermissions } from "@/lib/auth";
import type { UserPermissions } from "@/types/permissions";

export default function DebugAuthPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Force refresh token
        const tokenResult = await user.getIdTokenResult(true);
        setClaims(tokenResult.claims);

        // Fetch Firestore permissions
        const perms = await getUserPermissions(user.uid);
        setPermissions(perms);
      } catch (error) {
        console.error("Error getting auth data:", error);
      } finally {
        setLoading(false);
      }
    }

    getData();
  }, [user]);

  async function handleForceSignOut() {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();

    // Sign out
    await signOut();

    // Redirect to login
    window.location.href = "/login";
  }

  async function handleRefreshToken() {
    if (!user) return;

    setLoading(true);
    try {
      const tokenResult = await user.getIdTokenResult(true);
      setClaims(tokenResult.claims);

      const perms = await getUserPermissions(user.uid);
      setPermissions(perms);
    } catch (error) {
      console.error("Error refreshing token:", error);
    } finally {
      setLoading(false);
    }
  }

  const isSuperAdmin = claims?.superadmin === true || claims?.admin === true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auth Debug</h1>
        <p className="text-muted-foreground">Check your authentication token claims and permissions</p>
      </div>

      <div className="rounded-md border p-6 space-y-6">
        {/* User Info */}
        <div>
          <h2 className="text-lg font-semibold mb-2">User Info</h2>
          <p><strong>Email:</strong> {user?.email || "Not logged in"}</p>
          <p><strong>UID:</strong> {user?.uid || "N/A"}</p>
        </div>

        {/* Token Claims */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Token Claims</h2>
          {loading ? (
            <p>Loading token claims...</p>
          ) : claims ? (
            <pre className="bg-muted p-4 rounded overflow-auto text-xs">
              {JSON.stringify(claims, null, 2)}
            </pre>
          ) : (
            <p>No claims available</p>
          )}
        </div>

        {/* Claim Status */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Claim Status</h2>
          <div className="space-y-1">
            <p>
              <strong>Has superadmin claim:</strong>{" "}
              {claims?.superadmin === true ? (
                <span className="text-green-600 font-bold">✅ YES</span>
              ) : (
                <span className="text-red-600 font-bold">❌ NO</span>
              )}
            </p>
            <p>
              <strong>Has legacy admin claim:</strong>{" "}
              {claims?.admin === true ? (
                <span className="text-green-600 font-bold">✅ YES</span>
              ) : (
                <span className="text-red-600 font-bold">❌ NO</span>
              )}
            </p>
            <p className="mt-2">
              <strong>Overall Status:</strong>{" "}
              {isSuperAdmin ? (
                <span className="text-green-600 font-bold">✅ SUPERADMIN</span>
              ) : (
                <span className="text-red-600 font-bold">❌ NOT SUPERADMIN</span>
              )}
            </p>
          </div>
        </div>

        {/* Firestore Permissions */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Firestore Permissions</h2>
          {loading ? (
            <p>Loading permissions...</p>
          ) : permissions ? (
            <div>
              <pre className="bg-muted p-4 rounded overflow-auto text-xs mb-2">
                {JSON.stringify(permissions, null, 2)}
              </pre>
              <div className="text-sm space-y-1">
                <p><strong>Role:</strong> {permissions.role}</p>
                <p><strong>Client Access:</strong> {permissions.clientIds === null ? "All clients" : permissions.clientIds?.join(", ") || "None"}</p>
                <p><strong>Event Access:</strong> {permissions.eventIds === null ? "All events" : permissions.eventIds?.join(", ") || "None"}</p>
              </div>
            </div>
          ) : (
            <p className="text-yellow-600">⚠️ No userPermissions document found</p>
          )}
        </div>

        {/* Actions */}
        <div className="pt-4 space-y-2">
          <Button onClick={handleRefreshToken} variant="outline" className="mr-2">
            Refresh Token
          </Button>

          {!isSuperAdmin && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-semibold">Superadmin claim not found!</p>
              <p className="text-sm mb-2">Click below to completely clear your session and sign in again:</p>
              <Button onClick={handleForceSignOut} variant="destructive">
                Force Sign Out & Clear Session
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
