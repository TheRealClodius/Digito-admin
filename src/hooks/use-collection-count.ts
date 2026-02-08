import { useState, useEffect } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

  useEffect(() => {
    // Don't fetch if path is empty
    if (!path) {
      setCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchCount = async () => {
      try {
        setLoading(true);
        setError(null);

        const collectionRef = collection(db, path);
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
  }, [path]);

  return { count, loading, error };
}
