"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  type QueryConstraint,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UseCollectionOptions {
  path: string;
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  constraints?: QueryConstraint[];
}

export function useCollection<T extends DocumentData & { id: string }>({
  path,
  orderByField = "createdAt",
  orderDirection = "desc",
  constraints = [],
}: UseCollectionOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path) {
      setData([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, path),
      orderBy(orderByField, orderDirection),
      ...constraints
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(docs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [path, orderByField, orderDirection, JSON.stringify(constraints)]);

  return { data, loading, error };
}
