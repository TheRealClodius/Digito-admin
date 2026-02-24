"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { signOut } from "@/lib/auth";
import { useTranslation } from "@/hooks/use-translation";

/**
 * OAuth callback page for Cognito redirect flow.
 *
 * After Google OAuth redirect, Amplify automatically processes the auth code
 * from the URL. The AuthProvider picks up the `signedIn` Hub event and
 * populates the user. This page waits for that to happen, then redirects.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: permissionsLoading } = usePermissions();
  const { t } = useTranslation();

  useEffect(() => {
    if (authLoading || permissionsLoading) return;

    if (!user) {
      // Auth failed or user not found
      router.push("/login");
      return;
    }

    if (role) {
      // Authenticated and authorized
      router.push("/");
    } else {
      // Authenticated but no role (unauthorized)
      signOut().then(() => router.push("/unauthorized"));
    }
  }, [user, authLoading, role, permissionsLoading, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">
          {t("auth.callback.loading")}
        </p>
      </div>
    </div>
  );
}
