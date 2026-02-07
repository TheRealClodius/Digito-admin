import { Timestamp } from "firebase/firestore";

export type WhitelistAccessTier = "regular" | "premium" | "vip" | "staff";

export interface WhitelistEntry {
  id: string;
  email: string;
  accessTier: WhitelistAccessTier;
  company?: string | null;
  lockedFields?: string[];
  addedAt: Timestamp;
}

export type WhitelistEntryFormData = Omit<WhitelistEntry, "id" | "addedAt">;
