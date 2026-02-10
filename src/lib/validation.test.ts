import { describe, it, expect } from "vitest";
import { isValidFirestoreId, sanitizeFilename, isAllowedImageHost } from "./validation";

describe("isValidFirestoreId", () => {
  it("returns true for valid alphanumeric IDs", () => {
    expect(isValidFirestoreId("abc123")).toBe(true);
    expect(isValidFirestoreId("client-123")).toBe(true);
    expect(isValidFirestoreId("event_456")).toBe(true);
    expect(isValidFirestoreId("Brand789")).toBe(true);
  });

  it("returns false for empty strings", () => {
    expect(isValidFirestoreId("")).toBe(false);
  });

  it("returns false for IDs with slashes", () => {
    expect(isValidFirestoreId("client/123")).toBe(false);
    expect(isValidFirestoreId("../admin")).toBe(false);
    expect(isValidFirestoreId("events/123/brands")).toBe(false);
  });

  it("returns false for IDs with whitespace", () => {
    expect(isValidFirestoreId("client 123")).toBe(false);
    expect(isValidFirestoreId("client\t123")).toBe(false);
    expect(isValidFirestoreId("client\n123")).toBe(false);
    expect(isValidFirestoreId(" client123")).toBe(false);
    expect(isValidFirestoreId("client123 ")).toBe(false);
  });

  it("returns false for excessively long IDs", () => {
    const longId = "a".repeat(1501); // Firestore limit is 1500
    expect(isValidFirestoreId(longId)).toBe(false);
  });

  it("returns true for IDs at the maximum length", () => {
    const maxLengthId = "a".repeat(1500);
    expect(isValidFirestoreId(maxLengthId)).toBe(true);
  });

  it("returns false for null or undefined", () => {
    expect(isValidFirestoreId(null as any)).toBe(false);
    expect(isValidFirestoreId(undefined as any)).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isValidFirestoreId(123 as any)).toBe(false);
    expect(isValidFirestoreId({} as any)).toBe(false);
    expect(isValidFirestoreId([] as any)).toBe(false);
  });

  it("returns true for common special characters allowed in Firestore", () => {
    expect(isValidFirestoreId("client-123")).toBe(true);
    expect(isValidFirestoreId("client_456")).toBe(true);
    expect(isValidFirestoreId("client.789")).toBe(true);
  });

  it("returns false for potentially dangerous characters", () => {
    expect(isValidFirestoreId("client<script>")).toBe(false);
    expect(isValidFirestoreId("client&admin")).toBe(false);
    expect(isValidFirestoreId("client%20test")).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("preserves simple alphanumeric filenames with extensions", () => {
    expect(sanitizeFilename("image.png")).toBe("image.png");
    expect(sanitizeFilename("logo.jpg")).toBe("logo.jpg");
    expect(sanitizeFilename("document123.pdf")).toBe("document123.pdf");
  });

  it("removes path traversal sequences", () => {
    expect(sanitizeFilename("../../../etc/passwd")).toBe("etcpasswd");
    expect(sanitizeFilename("..\\windows\\system32")).toBe("windowssystem32");
  });

  it("removes spaces and replaces with hyphens", () => {
    expect(sanitizeFilename("my file name.jpg")).toBe("my-file-name.jpg");
    expect(sanitizeFilename("multiple   spaces.png")).toBe("multiple-spaces.png");
  });

  it("removes special characters except dots and hyphens", () => {
    expect(sanitizeFilename("file@name#test$.jpg")).toBe("filenametest.jpg");
    expect(sanitizeFilename("hello&world!.png")).toBe("helloworld.png");
  });

  it("preserves file extensions", () => {
    expect(sanitizeFilename("image.jpg")).toBe("image.jpg");
    expect(sanitizeFilename("document.PDF")).toBe("document.pdf");
    expect(sanitizeFilename("archive.tar.gz")).toBe("archive.tar.gz");
  });

  it("truncates excessively long filenames", () => {
    const longName = "a".repeat(300) + ".jpg";
    const sanitized = sanitizeFilename(longName);
    expect(sanitized.length).toBeLessThanOrEqual(255);
    expect(sanitized.endsWith(".jpg")).toBe(true);
  });

  it("handles unicode characters by removing them and adding fallback", () => {
    expect(sanitizeFilename("файл.jpg")).toBe("file.jpg");
    expect(sanitizeFilename("文件.png")).toBe("file.png");
  });

  it("returns a fallback name when the result is empty or just an extension", () => {
    expect(sanitizeFilename("...")).not.toBe("...");
    expect(sanitizeFilename("@#$%.jpg")).toBe("file.jpg");
    expect(sanitizeFilename(".jpg")).toBe("file.jpg");
  });

  it("lowercases the filename", () => {
    expect(sanitizeFilename("MyImage.JPG")).toBe("myimage.jpg");
    expect(sanitizeFilename("LOGO.PNG")).toBe("logo.png");
  });

  it("handles filenames with multiple dots", () => {
    expect(sanitizeFilename("my.file.name.tar.gz")).toBe("my.file.name.tar.gz");
  });

  it("handles edge case of empty string", () => {
    expect(sanitizeFilename("")).toBe("file");
  });
});

describe("isAllowedImageHost", () => {
  it("returns true for firebasestorage.googleapis.com URLs", () => {
    expect(isAllowedImageHost("https://firebasestorage.googleapis.com/v0/b/bucket/o/file.jpg?alt=media")).toBe(true);
  });

  it("returns true for storage.googleapis.com URLs", () => {
    expect(isAllowedImageHost("https://storage.googleapis.com/bucket/file.jpg")).toBe(true);
  });

  it("returns true for digito-poc.firebasestorage.app URLs", () => {
    expect(isAllowedImageHost("https://digito-poc.firebasestorage.app/file.jpg")).toBe(true);
  });

  it("returns true for blob: URLs (local previews)", () => {
    expect(isAllowedImageHost("blob:http://localhost:3000/abc-123")).toBe(true);
  });

  it("returns true for relative paths (local assets)", () => {
    expect(isAllowedImageHost("/digito-logo.svg")).toBe(true);
  });

  it("returns false for picsum.photos URLs", () => {
    expect(isAllowedImageHost("https://picsum.photos/seed/salone-logo/200")).toBe(false);
  });

  it("returns false for other unconfigured hosts", () => {
    expect(isAllowedImageHost("https://example.com/image.jpg")).toBe(false);
    expect(isAllowedImageHost("https://imgur.com/abc.png")).toBe(false);
  });

  it("returns false for empty strings", () => {
    expect(isAllowedImageHost("")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isAllowedImageHost("not-a-url")).toBe(false);
  });
});
