import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  id: string;
  email?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  qualification?: string | null;
  avatarUrl?: string | null;
  accessTier?: string | null;
  profileVersion?: number;
  createdAt?: Timestamp;
}
