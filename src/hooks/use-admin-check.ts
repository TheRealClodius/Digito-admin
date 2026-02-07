"use client";

import { useState, useEffect } from "react";
import { checkSuperAdmin } from "@/lib/auth";

export function useAdminCheck(uid: string | undefined) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setIsAdmin(null);
      setLoading(false);
      return;
    }

    checkSuperAdmin(uid)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false))
      .finally(() => setLoading(false));
  }, [uid]);

  return { isAdmin, loading };
}
