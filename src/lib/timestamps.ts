/**
 * Safely convert an unknown value to a Date or null.
 * Handles Firestore Timestamps, ISO strings, numeric timestamps, and Date objects.
 */
export function toDate(val: unknown): Date | null {
  if (val == null || val === "") return null;

  if (val instanceof Date) return val;

  // Firestore Timestamp — has a toDate() method
  if (typeof val === "object" && typeof (val as { toDate?: unknown }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate();
  }

  if (typeof val === "string") return new Date(val);
  if (typeof val === "number") return new Date(val);

  return null;
}
