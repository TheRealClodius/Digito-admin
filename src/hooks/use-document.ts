"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot, type DocumentData } from "firebase/firestore";
import { getDbInstance } from "@/lib/firebase";

export function useDocument<T extends DocumentData>(path: string, id: string | undefined) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path || !id) {
      setData(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(getDbInstance(), path, id),
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T & { id: string });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [path, id]);

  return { data, loading, error };
}
