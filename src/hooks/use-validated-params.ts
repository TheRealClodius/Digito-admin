"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { isValidFirestoreId } from "@/lib/validation";

/**
 * Validates route param values as valid Firestore IDs.
 * Calls notFound() if any param is invalid.
 */
export function validateParams(params: Record<string, string>): void {
  for (const value of Object.values(params)) {
    if (!isValidFirestoreId(value)) {
      notFound();
    }
  }
}

/**
 * Unwraps async route params, validates them, and returns.
 * Calls notFound() if any param is invalid.
 */
export function useValidatedParams<T extends Record<string, string>>(
  params: Promise<T>
): T {
  const resolved = use(params);
  validateParams(resolved);
  return resolved;
}
