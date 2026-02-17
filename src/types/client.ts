/**
 * Client type
 * Used for client-facing operations (UI, API responses)
 * For MongoDB operations, see ClientDocument in @/types/mongodb-schema
 */
export interface Client {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export type ClientFormData = Omit<Client, "id" | "createdAt">;
