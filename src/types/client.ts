import { Timestamp } from "firebase/firestore";

export interface Client {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  createdAt: Timestamp;
}

export type ClientFormData = Omit<Client, "id" | "createdAt">;
