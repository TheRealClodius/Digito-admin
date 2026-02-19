export type StandSize = "small" | "medium" | "large" | "custom";

export interface Stand {
  id: string;
  name: string;
  description?: string | null;
  hallOrZone?: string | null;
  size?: StandSize | null;
  brandId?: string | null;
  imageUrl?: string | null;
  createdAt: Date | string;
}

export type StandFormData = Omit<Stand, "id" | "createdAt">;
