/**
 * Validates a route parameter / document ID.
 *
 * Requirements:
 * - Non-empty string
 * - No forward slashes (/)
 * - No whitespace
 * - Maximum 1500 characters
 * - Only alphanumeric, hyphen, underscore, and period
 *
 * @param id - The ID to validate
 * @returns true if the ID is valid, false otherwise
 */
export function isValidDocumentId(id: unknown): boolean {
  if (typeof id !== "string") {
    return false;
  }

  if (id.length === 0) {
    return false;
  }

  if (id.length > 1500) {
    return false;
  }

  if (id.includes("/")) {
    return false;
  }

  if (/\s/.test(id)) {
    return false;
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(id)) {
    return false;
  }

  return true;
}

/**
 * Checks whether a URL is safe to pass to next/image.
 * Returns true for configured remote hosts (R2), blob: URLs, and relative paths.
 * Keep in sync with the remotePatterns array in next.config.ts.
 */
export function isAllowedImageHost(url: string): boolean {
  if (!url) return false;

  // Relative paths (local assets like /digito-logo.svg)
  if (url.startsWith("/")) return true;

  // Blob URLs from local file previews
  if (url.startsWith("blob:")) return true;

  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(".r2.dev");
  } catch {
    return false;
  }
}

/**
 * Sanitizes a filename for safe use in storage paths (R2/S3).
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

  // Keep only alphanumeric, dots, hyphens, and underscores
  // This removes unicode and special characters
  sanitized = sanitized.replace(/[^a-z0-9._-]/g, "");

  // Check if we have an extension (starts with a dot after sanitization)
  const startsWithDot = sanitized.startsWith(".");

  // Remove leading/trailing dots, hyphens, and underscores
  sanitized = sanitized.replace(/^[._-]+|[._-]+$/g, "");

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
