import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
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
