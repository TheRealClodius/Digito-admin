export type WhitelistAccessTier = "regular" | "premium" | "vip" | "staff";

export interface WhitelistEntry {
  id: string;
  email: string;
  accessTier: WhitelistAccessTier;
  company?: string | null;
  lockedFields?: string[];
  addedAt: Date | string;
}

export type WhitelistEntryFormData = Omit<WhitelistEntry, "id" | "addedAt">;
