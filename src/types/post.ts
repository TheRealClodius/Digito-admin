export interface Post {
  id: string;
  imageUrl: string;
  description?: string | null;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  createdAt: Date | string;
}

export type PostFormData = Omit<Post, "id" | "createdAt">;
