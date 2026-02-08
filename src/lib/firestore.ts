import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Add a new document to a Firestore collection.
 * Automatically adds a `createdAt` server timestamp.
 */
export async function addDocument(path: string, data: Record<string, unknown>) {
  const colRef = collection(db, path);
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an existing document (merge mode — only overwrites provided fields).
 */
export async function updateDocument(
  path: string,
  id: string,
  data: Record<string, unknown>
) {
  const docRef = doc(db, path, id);
  await setDoc(docRef, data, { merge: true });
}

/**
 * Delete a document by path and ID.
 */
export async function deleteDocument(path: string, id: string) {
  const docRef = doc(db, path, id);
  await deleteDoc(docRef);
}

/**
 * Query documents by a field value. Returns matching docs with their IDs.
 */
export async function queryDocuments<T>(
  path: string,
  field: string,
  value: unknown
): Promise<(T & { id: string })[]> {
  const q = query(collection(db, path), where(field, "==", value));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as T & { id: string }));
}
