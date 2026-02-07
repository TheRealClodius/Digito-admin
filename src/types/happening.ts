import { Timestamp } from "firebase/firestore";

export type HappeningType = "demo" | "performance" | "launch" | "networking" | "reception" | "other";

export interface Happening {
  id: string;
  title: string;
  description?: string | null;
  startTime: Timestamp;
  endTime: Timestamp;
  location?: string | null;
  type: HappeningType;
  hostName?: string | null;
  hostAvatarUrl?: string | null;
  imageUrl?: string | null;
  brandId?: string | null;
  isHighlighted: boolean;
  requiresAccess: boolean;
  accessTier?: string | null;
  createdAt: Timestamp;
}

export type HappeningFormData = Omit<Happening, "id" | "createdAt">;
