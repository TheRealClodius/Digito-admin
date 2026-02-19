export type SessionType = "talk" | "workshop" | "panel" | "networking" | "other";
export interface Session {
  id: string;
  title: string;
  description?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  location?: string | null;
  type: SessionType;
  speakerName?: string | null;
  speakerBio?: string | null;
  speakerAvatarUrl?: string | null;
  participantId?: string | null;
  requiresAccess: boolean;
  accessTier?: string | null;
  imageUrl?: string | null;
  createdAt: Date | string;
}

export type SessionFormData = Omit<Session, "id" | "createdAt">;
