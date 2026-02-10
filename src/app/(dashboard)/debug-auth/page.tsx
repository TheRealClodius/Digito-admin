"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";

export default function DebugAuthPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getClaims() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Force refresh token
        const tokenResult = await user.getIdTokenResult(true);
        setClaims(tokenResult.claims);
      } catch (error) {
        console.error("Error getting token:", error);
      } finally {
        setLoading(false);
      }
    }

    getClaims();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auth Debug</h1>
        <p className="text-muted-foreground">Check your authentication token claims</p>
      </div>

      <div className="rounded-md border p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">User Info</h2>
          <p><strong>Email:</strong> {user?.email || "Not logged in"}</p>
          <p><strong>UID:</strong> {user?.uid || "N/A"}</p>
        </div>

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

        <div className="pt-4">
          <p className="mb-2">
            <strong>Has admin claim:</strong>{" "}
            {claims?.admin === true ? (
              <span className="text-green-600 font-bold">✅ YES</span>
            ) : (
              <span className="text-red-600 font-bold">❌ NO</span>
            )}
          </p>

          {claims?.admin !== true && (
            <div className="space-y-2 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-semibold">Admin claim not found!</p>
              <p className="text-sm">Click below to completely clear your session and sign in again:</p>
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
