/**
 * Validates a Firestore document ID.
 *
 * Firestore document IDs must meet these requirements:
 * - Non-empty string
 * - No forward slashes (/)
 * - No whitespace
 * - Maximum 1500 bytes (we check character length as a proxy)
 * - Should not contain potentially dangerous characters
 *
 * @param id - The ID to validate
 * @returns true if the ID is valid, false otherwise
 */
export function isValidFirestoreId(id: unknown): boolean {
  // Check if it's a string
  if (typeof id !== "string") {
    return false;
  }

  // Check if it's empty
  if (id.length === 0) {
    return false;
  }

  // Check maximum length (Firestore limit is 1500 bytes)
  if (id.length > 1500) {
    return false;
  }

  // Check for forward slashes
  if (id.includes("/")) {
    return false;
  }

  // Check for whitespace (space, tab, newline, etc.)
  if (/\s/.test(id)) {
    return false;
  }

  // Check for potentially dangerous characters
  // Allow alphanumeric, hyphen, underscore, and period
  // Firestore actually allows more characters, but we're being conservative
  if (!/^[a-zA-Z0-9_.-]+$/.test(id)) {
    return false;
  }

  return true;
}

/**
 * Hostnames allowed by next.config.ts for next/image.
 * Keep in sync with the remotePatterns array in next.config.ts.
 */
const ALLOWED_IMAGE_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "digito-poc.firebasestorage.app",
];

/**
 * Checks whether a URL is safe to pass to next/image.
 * Returns true for configured remote hosts, blob: URLs, and relative paths.
 */
export function isAllowedImageHost(url: string): boolean {
  if (!url) return false;

  // Relative paths (local assets like /digito-logo.svg)
  if (url.startsWith("/")) return true;

  // Blob URLs from local file previews
  if (url.startsWith("blob:")) return true;

  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_HOSTS.some((host) => parsed.hostname === host);
  } catch {
    return false;
  }
}

/**
 * Sanitizes a filename for safe use in Firebase Storage paths.
 *
 * - Removes path traversal sequences (../, ..\)
 * - Replaces spaces with hyphens
 * - Removes special characters (keeps alphanumeric, dots, hyphens)
 * - Lowercases the filename
 * - Truncates to maximum 255 characters
 * - Preserves file extensions
 * - Returns a fallback "file" if result is empty
 *
 * @param filename - The filename to sanitize
 * @returns A sanitized filename safe for storage
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || filename.trim().length === 0) {
    return "file";
  }

  // Lowercase and trim
  let sanitized = filename.toLowerCase().trim();

  // Remove path separators and traversal sequences
  sanitized = sanitized.replace(/\.\./g, "");
  sanitized = sanitized.replace(/[/\\]/g, "");

  // Replace multiple spaces with a single hyphen
  sanitized = sanitized.replace(/\s+/g, "-");

  // Keep only alphanumeric, dots, and hyphens
  // This removes unicode and special characters
  sanitized = sanitized.replace(/[^a-z0-9.-]/g, "");

  // Check if we have an extension (starts with a dot after sanitization)
  const startsWithDot = sanitized.startsWith(".");

  // Remove leading/trailing dots and hyphens
  sanitized = sanitized.replace(/^[.-]+|[.-]+$/g, "");

  // If the result is empty or was just an extension, use a fallback
  if (!sanitized || startsWithDot) {
    // If it was an extension (like .jpg), rebuild with "file" prefix
    if (startsWithDot) {
      const match = sanitized.match(/^(.*)$/);
      return match ? `file.${sanitized}` : "file";
    }
    return "file";
  }

  // Truncate to max 255 characters while preserving extension
  if (sanitized.length > 255) {
    const lastDotIndex = sanitized.lastIndexOf(".");
    if (lastDotIndex > 0) {
      const extension = sanitized.slice(lastDotIndex);
      const maxNameLength = 255 - extension.length;
      sanitized = sanitized.slice(0, maxNameLength) + extension;
    } else {
      sanitized = sanitized.slice(0, 255);
    }
  }

  return sanitized;
}
