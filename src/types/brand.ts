import { Timestamp } from "firebase/firestore";

export interface Brand {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  stallNumber?: string | null;
  isHighlighted: boolean;
  createdAt: Timestamp;
}

export type BrandFormData = Omit<Brand, "id" | "createdAt">;
