"use client";

import { useState, useEffect } from "react";
import { type User } from "firebase/auth";
import { checkSuperAdmin } from "@/lib/auth";

export function useAdminCheck(user: User | null) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    checkSuperAdmin(user)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false))
      .finally(() => setLoading(false));
  }, [user]);

  return { isAdmin, loading };
}
