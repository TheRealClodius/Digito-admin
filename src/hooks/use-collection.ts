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
import { onAuthStateChanged, type User } from "firebase/auth";
import { getDbInstance, getAuthInstance } from "@/lib/firebase";

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
  const [authUser, setAuthUser] = useState<User | null>(null);

  // Track Firebase Auth state — avoids Firestore permission errors caused by
  // onSnapshot firing before the auth token is propagated to the connection.
  useEffect(() => {
    return onAuthStateChanged(getAuthInstance(), setAuthUser);
  }, []);

  useEffect(() => {
    if (!path) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Don't subscribe until Firebase Auth has confirmed the user — sending
    // a Firestore listener before auth credentials are ready causes
    // "Missing or insufficient permissions" errors.
    if (!authUser) {
      return;
    }

    setLoading(true);
    setError(null);

    const queryConstraints: QueryConstraint[] = [
      orderBy(orderByField, orderDirection),
      ...constraints,
    ];

    if (pageSize) {
      queryConstraints.push(limit(pageSize));
    }

    const q = query(collection(getDbInstance(), path), ...queryConstraints);

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
  }, [path, orderByField, orderDirection, constraintsKey, pageSize, authUser]);

  return { data, loading, error };
}
