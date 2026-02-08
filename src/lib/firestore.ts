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
 * Automatically adds an `updatedAt` server timestamp.
 */
export async function updateDocument(
  path: string,
  id: string,
  data: Record<string, unknown>
) {
  const docRef = doc(db, path, id);
  await setDoc(
    docRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Delete a document by path and ID.
 */
export async function deleteDocument(path: string, id: string) {
  const docRef = doc(db, path, id);
  await deleteDoc(docRef);
}

const EVENT_SUBCOLLECTIONS = [
  "brands",
  "sessions",
  "happenings",
  "participants",
  "posts",
  "whitelist",
  "stands",
  "users",
];

/**
 * Delete an event and all its subcollection documents.
 */
export async function deleteEventCascade(eventsPath: string, eventId: string) {
  const eventDocPath = `${eventsPath}/${eventId}`;

  for (const sub of EVENT_SUBCOLLECTIONS) {
    const subColRef = collection(db, `${eventDocPath}/${sub}`);
    const snapshot = await getDocs(subColRef);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
  }

  const eventRef = doc(db, eventsPath, eventId);
  await deleteDoc(eventRef);
}

/**
 * Delete a client and all its events (with cascade).
 */
export async function deleteClientCascade(clientId: string) {
  const eventsPath = `clients/${clientId}/events`;
  const eventsColRef = collection(db, eventsPath);
  const eventsSnapshot = await getDocs(eventsColRef);

  for (const eventDoc of eventsSnapshot.docs) {
    await deleteEventCascade(eventsPath, eventDoc.id);
  }

  const clientRef = doc(db, "clients", clientId);
  await deleteDoc(clientRef);
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
