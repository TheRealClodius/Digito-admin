import { Timestamp } from "firebase/firestore";

export type ParticipantRole = "speaker" | "panelist" | "host" | "brand_rep" | "moderator" | "performer" | "other";

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
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
  createdAt: Timestamp;
}

export type ParticipantFormData = Omit<Participant, "id" | "createdAt">;
