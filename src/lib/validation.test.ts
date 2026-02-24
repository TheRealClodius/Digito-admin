import { describe, it, expect } from "vitest";
import { isValidDocumentId, sanitizeFilename, isAllowedImageHost } from "./validation";

describe("isValidDocumentId", () => {
  it("returns true for valid alphanumeric IDs", () => {
    expect(isValidDocumentId("abc123")).toBe(true);
    expect(isValidDocumentId("client-123")).toBe(true);
    expect(isValidDocumentId("event_456")).toBe(true);
    expect(isValidDocumentId("Brand789")).toBe(true);
  });

  it("returns false for empty strings", () => {
    expect(isValidDocumentId("")).toBe(false);
  });

  it("returns false for IDs with slashes", () => {
    expect(isValidDocumentId("client/123")).toBe(false);
    expect(isValidDocumentId("../admin")).toBe(false);
    expect(isValidDocumentId("events/123/brands")).toBe(false);
  });

  it("returns false for IDs with whitespace", () => {
    expect(isValidDocumentId("client 123")).toBe(false);
    expect(isValidDocumentId("client\t123")).toBe(false);
    expect(isValidDocumentId("client\n123")).toBe(false);
    expect(isValidDocumentId(" client123")).toBe(false);
    expect(isValidDocumentId("client123 ")).toBe(false);
  });

  it("returns false for excessively long IDs", () => {
    const longId = "a".repeat(1501);
    expect(isValidDocumentId(longId)).toBe(false);
  });

  it("returns true for IDs at the maximum length", () => {
    const maxLengthId = "a".repeat(1500);
    expect(isValidDocumentId(maxLengthId)).toBe(true);
  });

  it("returns false for null or undefined", () => {
    expect(isValidDocumentId(null as any)).toBe(false);
    expect(isValidDocumentId(undefined as any)).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isValidDocumentId(123 as any)).toBe(false);
    expect(isValidDocumentId({} as any)).toBe(false);
    expect(isValidDocumentId([] as any)).toBe(false);
  });

  it("returns true for IDs with hyphens, underscores, and periods", () => {
    expect(isValidDocumentId("client-123")).toBe(true);
    expect(isValidDocumentId("client_456")).toBe(true);
    expect(isValidDocumentId("client.789")).toBe(true);
  });

  it("returns false for potentially dangerous characters", () => {
    expect(isValidDocumentId("client<script>")).toBe(false);
    expect(isValidDocumentId("client&admin")).toBe(false);
    expect(isValidDocumentId("client%20test")).toBe(false);
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

  it("removes special characters except dots, hyphens, and underscores", () => {
    expect(sanitizeFilename("file@name#test$.jpg")).toBe("filenametest.jpg");
    expect(sanitizeFilename("hello&world!.png")).toBe("helloworld.png");
  });

  it("preserves underscores in filenames", () => {
    expect(sanitizeFilename("logo_1234_file.png")).toBe("logo_1234_file.png");
    expect(sanitizeFilename("image_2026_01_27.jpg")).toBe("image_2026_01_27.jpg");
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
  it("returns true for R2 URLs", () => {
    expect(isAllowedImageHost("https://pub-abc123.r2.dev/file.jpg")).toBe(true);
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
