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
  writeBatch,
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
 * Delete an event and all its subcollection documents using batched writes.
 * Firestore batches are limited to 500 operations, so we chunk if needed.
 */
export async function deleteEventCascade(eventsPath: string, eventId: string) {
  const eventDocPath = `${eventsPath}/${eventId}`;
  const allRefs: ReturnType<typeof doc>[] = [];

  for (const sub of EVENT_SUBCOLLECTIONS) {
    const subColRef = collection(db, `${eventDocPath}/${sub}`);
    const snapshot = await getDocs(subColRef);
    for (const docSnap of snapshot.docs) {
      allRefs.push(docSnap.ref);
    }
  }

  // Add the event document itself last
  allRefs.push(doc(db, eventsPath, eventId));

  // Batch deletes in chunks of 500 (Firestore limit)
  const BATCH_SIZE = 500;
  for (let i = 0; i < allRefs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = allRefs.slice(i, i + BATCH_SIZE);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
  }
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

interface BatchWhitelistSyncOptions {
  whitelistPath: string;
  whitelistId: string | null; // null = new entry (use addDoc)
  whitelistData: Record<string, unknown>;
  usersPath: string;
  email: string;
  lockedFields: string[];
}

/**
 * Atomically update/create a whitelist entry and sync locked fields
 * to the matching user profile in a single batch write.
 */
export async function batchUpdateWhitelistAndUser({
  whitelistPath,
  whitelistId,
  whitelistData,
  usersPath,
  email,
  lockedFields,
}: BatchWhitelistSyncOptions) {
  // For new entries, use addDoc (can't batch addDoc, so do it first)
  if (!whitelistId) {
    await addDoc(collection(db, whitelistPath), {
      ...whitelistData,
      createdAt: serverTimestamp(),
    });

    // If no locked fields, nothing more to sync
    if (lockedFields.length === 0) return;

    // Find matching user and sync in a batch
    const q = query(collection(db, usersPath), where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.docs.length > 0) {
      const batch = writeBatch(db);
      const userRef = doc(db, usersPath, snapshot.docs[0].id);
      const update: Record<string, unknown> = {};
      for (const field of lockedFields) {
        if (field in whitelistData) {
          update[field] = whitelistData[field];
        }
      }
      if (Object.keys(update).length > 0) {
        batch.set(userRef, { ...update, updatedAt: serverTimestamp() }, { merge: true });
        await batch.commit();
      }
    }
    return;
  }

  // For existing entries, batch the whitelist update + user sync together
  const batch = writeBatch(db);

  // 1. Update whitelist entry
  const whitelistRef = doc(db, whitelistPath, whitelistId);
  batch.set(whitelistRef, { ...whitelistData, updatedAt: serverTimestamp() }, { merge: true });

  // 2. Sync locked fields to user profile (if any)
  if (lockedFields.length > 0) {
    const q = query(collection(db, usersPath), where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.docs.length > 0) {
      const userRef = doc(db, usersPath, snapshot.docs[0].id);
      const update: Record<string, unknown> = {};
      for (const field of lockedFields) {
        if (field in whitelistData) {
          update[field] = whitelistData[field];
        }
      }
      if (Object.keys(update).length > 0) {
        batch.set(userRef, { ...update, updatedAt: serverTimestamp() }, { merge: true });
      }
    }
  }

  await batch.commit();
}
