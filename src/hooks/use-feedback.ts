"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { FeedbackEntry } from "@/types/feedback";

export function useFeedback(clientId: string, eventId: string) {
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const [data, setData] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const isAuthenticated = !!user;

  useEffect(() => {
    if (!clientId || !eventId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Wait for auth to be ready before fetching
    if (!userRef.current) {
      setLoading(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const token = await userRef.current!.getIdToken();
        const res = await fetch(
          `/api/feedback?clientId=${encodeURIComponent(clientId)}&eventId=${encodeURIComponent(eventId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (cancelled) return;

        if (!res.ok) {
          const body = await res.json();
          setError(body.error || "Failed to load feedback");
          setData([]);
        } else {
          const entries: FeedbackEntry[] = await res.json();
          setData(entries);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load feedback");
        setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, eventId, refreshKey, isAuthenticated]);

  return { data, loading, error, refresh };
}
