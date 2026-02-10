import { Timestamp } from "firebase/firestore";

export type ParticipantRole = "speaker" | "panelist" | "host" | "brand_rep" | "moderator" | "performer" | "other";

export type AccessTier = "regular" | "premium" | "vip" | "staff";

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: ParticipantRole;
  company?: string | null;
  title?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  brandId?: string | null;
  sessionIds?: string[];
  happeningIds?: string[];
  isHighlighted: boolean;
  accessTier: AccessTier;
  lockedFields?: string[];
  createdAt: Timestamp;
  addedAt: Timestamp;
}

export type ParticipantFormData = Omit<Participant, "id" | "createdAt" | "addedAt">;
