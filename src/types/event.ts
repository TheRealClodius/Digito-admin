import { Timestamp } from "firebase/firestore";

export interface Event {
  id: string;
  clientId: string;
  name: string;
  description?: string | null;
  venue?: string | null;
  startDate: Timestamp;
  endDate: Timestamp;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  isActive: boolean;
  createdAt: Timestamp;
}

export type EventFormData = Omit<Event, "id" | "createdAt">;
