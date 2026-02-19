"use client";

import { fetchAuthSession } from "aws-amplify/auth";

/**
 * Custom error class for API responses with non-OK status.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
}

/**
 * Authenticated fetch helper for client-side API calls.
 * Automatically attaches Cognito access token as Bearer authorization.
 *
 * @param path - API route path (e.g., "/api/clients")
 * @param options - Optional method and body
 * @returns Parsed JSON response
 * @throws ApiError on non-OK responses
 * @throws Error if not authenticated
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { method = "GET", body } = options;

  const session = await fetchAuthSession({ forceRefresh: false });
  const token = session.tokens?.accessToken?.toString();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(path, fetchOptions);

  if (response.status === 204) {
    return null as T;
  }

  if (!response.ok) {
    let message = `API error ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) message = data.error;
    } catch {
      // Response body wasn't JSON — use generic message
    }
    throw new ApiError(message, response.status);
  }

  return response.json();
}
