import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

/**
 * Serialize a MongoDB document for JSON response:
 * - Converts _id (ObjectId) to id (string)
 * - Converts Date fields to ISO strings
 * - Converts any ObjectId fields to strings
 */
export function serializeDoc<T extends Record<string, unknown>>(
  doc: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(doc)) {
    if (key === '_id') {
      result['id'] = value instanceof ObjectId ? value.toHexString() : String(value);
    } else if (value instanceof ObjectId) {
      result[key] = value.toHexString();
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Serialize an array of MongoDB documents
 */
export function serializeDocs<T extends Record<string, unknown>>(
  docs: T[]
): Record<string, unknown>[] {
  return docs.map(serializeDoc);
}

/**
 * Parse a string as an ObjectId. Returns null if invalid.
 */
export function parseObjectId(str: string): ObjectId | null {
  if (!str || !ObjectId.isValid(str) || str.length !== 24) {
    return null;
  }
  return new ObjectId(str);
}

/**
 * Extract pagination parameters from URL search params.
 * Defaults: sort=createdAt, order=desc, limit=100, page=1
 */
export function paginationParams(searchParams: URLSearchParams): {
  sort: string;
  order: 1 | -1;
  limit: number;
  skip: number;
} {
  const sort = searchParams.get('sort') || 'createdAt';
  const order = searchParams.get('order') === 'asc' ? 1 : -1;
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1), 500);
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
  const skip = (page - 1) * limit;

  return { sort, order, limit, skip };
}

/**
 * Return a JSON error response
 */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
