import { Timestamp } from "firebase/firestore";

export interface Post {
  id: string;
  imageUrl: string;
  description?: string | null;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  createdAt: Timestamp;
}

export type PostFormData = Omit<Post, "id" | "createdAt">;
