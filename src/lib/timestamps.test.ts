import { describe, it, expect } from "vitest";
import { toDate } from "./timestamps";

describe("toDate", () => {
  it("converts Firestore Timestamp objects (has .toDate method)", () => {
    const ts = { toDate: () => new Date("2024-01-15T10:00:00Z") };
    expect(toDate(ts)).toEqual(new Date("2024-01-15T10:00:00Z"));
  });

  it("converts ISO date strings", () => {
    const result = toDate("2024-01-15T10:00:00Z");
    expect(result).toEqual(new Date("2024-01-15T10:00:00Z"));
  });

  it("converts numeric timestamps (milliseconds)", () => {
    const ms = new Date("2024-01-15T10:00:00Z").getTime();
    expect(toDate(ms)).toEqual(new Date("2024-01-15T10:00:00Z"));
  });

  it("passes through Date objects", () => {
    const d = new Date("2024-01-15T10:00:00Z");
    expect(toDate(d)).toBe(d);
  });

  it("returns null for null", () => {
    expect(toDate(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(toDate(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(toDate("")).toBeNull();
  });
});
