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
  createdAt: Date | string;
}

export type BrandFormData = Omit<Brand, "id" | "createdAt">;
