/**
 * Event type
 * Used for client-facing operations (UI, API responses)
 */
export interface Event {
  id: string;
  clientId: string;
  /** Event code - MongoDB database name for this event (e.g., "2025089") */
  eventCode: string;
  name: string;
  description?: string | null;
  venue?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  chatPrompt?: string | null;
  imageUrls?: string[] | null;
  isActive: boolean;
  createdAt: Date | string;
}

export type EventFormData = Omit<Event, "id" | "createdAt">;
