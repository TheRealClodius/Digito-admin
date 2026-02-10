import { useState, useEffect } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getDbInstance, getAuthInstance } from "@/lib/firebase";

interface UseCollectionCountOptions {
  path: string;
}

interface UseCollectionCountResult {
  count: number;
  loading: boolean;
  error: Error | null;
}

/**
 * A hook that fetches the count of documents in a Firestore collection
 * without downloading the actual documents. Uses getCountFromServer for efficiency.
 */
export function useCollectionCount({
  path,
}: UseCollectionCountOptions): UseCollectionCountResult {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<Error | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);

  // Track Firebase Auth state — avoids Firestore permission errors caused by
  // querying before the auth token is propagated to the connection.
  useEffect(() => {
    return onAuthStateChanged(getAuthInstance(), setAuthUser);
  }, []);

  useEffect(() => {
    // Don't fetch if path is empty
    if (!path) {
      setCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    // Don't query until Firebase Auth has confirmed the user — sending
    // a Firestore query before auth credentials are ready causes
    // "Missing or insufficient permissions" errors.
    if (!authUser) {
      return;
    }

    let cancelled = false;

    const fetchCount = async () => {
      try {
        setLoading(true);
        setError(null);

        const collectionRef = collection(getDbInstance(), path);
        const snapshot = await getCountFromServer(collectionRef);

        if (!cancelled) {
          setCount(snapshot.data().count);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setCount(0);
          setLoading(false);
        }
      }
    };

    fetchCount();

    return () => {
      cancelled = true;
    };
  }, [path, authUser]);

  return { count, loading, error };
}
