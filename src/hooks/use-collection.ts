"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  type QueryConstraint,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UseCollectionOptions {
  path: string;
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  constraints?: QueryConstraint[];
  /** Stable key for constraint identity — avoids JSON.stringify on every render */
  constraintsKey?: string;
  /** When set, limits the query to this many documents */
  pageSize?: number;
}

export function useCollection<T extends DocumentData & { id: string }>({
  path,
  orderByField = "createdAt",
  orderDirection = "desc",
  constraints = [],
  constraintsKey = "",
  pageSize,
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

    const queryConstraints: QueryConstraint[] = [
      orderBy(orderByField, orderDirection),
      ...constraints,
    ];

    if (pageSize) {
      queryConstraints.push(limit(pageSize));
    }

    const q = query(collection(db, path), ...queryConstraints);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, orderByField, orderDirection, constraintsKey, pageSize]);

  return { data, loading, error };
}
