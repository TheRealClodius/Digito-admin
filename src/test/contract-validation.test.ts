import { describe, it, expect } from "vitest";
import { brandSchema, sessionSchema, postSchema } from "@/lib/schemas";

// Import shared contract fixtures (symlinked from Flutter project)
import brandContract from "./contract-fixtures/brand.contract.json";
import sessionContract from "./contract-fixtures/session.contract.json";
import postContract from "./contract-fixtures/post.contract.json";

/**
 * Contract validation tests: verify that the Admin's Zod schemas match
 * the shared contract fixture files used by Flutter's contract tests.
 *
 * If a field is added/renamed in the admin schema but not in the fixture,
 * these tests will catch the drift. Similarly, if the fixture adds a field
 * that the admin schema doesn't know about, these tests will fail.
 *
 * Fixture files live in: digito-1/test/contract/fixtures/*.contract.json
 * Symlinked to: Digito-admin/src/test/contract-fixtures/
 */
describe("Contract validation — Brand", () => {
  const contractFields = Object.keys(brandContract.fields);
  const adminOnlyFields = brandContract.adminOnly;
  const zodFields = Object.keys(brandSchema.shape);

  it("Zod schema covers every contract field", () => {
    for (const field of contractFields) {
      expect(zodFields, `Admin schema missing contract field: ${field}`).toContain(field);
    }
  });

  it("contract covers every Zod schema field (excluding admin-only)", () => {
    const allContractFields = [...contractFields, ...adminOnlyFields];
    for (const field of zodFields) {
      expect(
        allContractFields,
        `Zod field '${field}' not declared in contract (add to fields or adminOnly)`,
      ).toContain(field);
    }
  });

  it("complete example passes Zod validation", () => {
    const result = brandSchema.safeParse(brandContract.examples.complete);
    expect(result.success, `Zod validation failed: ${JSON.stringify(result)}`).toBe(true);
  });

  it("minimal example passes Zod validation", () => {
    const result = brandSchema.safeParse(brandContract.examples.minimal);
    expect(result.success, `Zod validation failed: ${JSON.stringify(result)}`).toBe(true);
  });

  it("submitted data shape matches Flutter-expected Firestore contract", () => {
    // Parse the complete example through Zod (mimics form submission)
    const parsed = brandSchema.parse(brandContract.examples.complete);
    // Every contract field should be present in the parsed output
    for (const field of contractFields) {
      expect(parsed).toHaveProperty(field);
    }
  });
});

describe("Contract validation — Session", () => {
  const contractFields = Object.keys(sessionContract.fields);
  const adminOnlyFields = sessionContract.adminOnly;
  const zodFields = Object.keys(sessionSchema.shape);

  it("Zod schema covers every contract field", () => {
    for (const field of contractFields) {
      expect(zodFields, `Admin schema missing contract field: ${field}`).toContain(field);
    }
  });

  it("contract covers every Zod schema field (excluding admin-only)", () => {
    const allContractFields = [...contractFields, ...adminOnlyFields];
    for (const field of zodFields) {
      expect(
        allContractFields,
        `Zod field '${field}' not declared in contract (add to fields or adminOnly)`,
      ).toContain(field);
    }
  });

  it("complete example passes Zod validation", () => {
    const result = sessionSchema.safeParse({
      ...sessionContract.examples.complete,
      // Fixture uses ISO strings for timestamps; Zod expects Date objects
      startTime: new Date(sessionContract.examples.complete.startTime),
      endTime: new Date(sessionContract.examples.complete.endTime),
    });
    expect(result.success, `Zod validation failed: ${JSON.stringify(result)}`).toBe(true);
  });

  it("minimal example passes Zod validation", () => {
    const result = sessionSchema.safeParse({
      ...sessionContract.examples.minimal,
      startTime: new Date(sessionContract.examples.minimal.startTime),
      endTime: new Date(sessionContract.examples.minimal.endTime),
    });
    expect(result.success, `Zod validation failed: ${JSON.stringify(result)}`).toBe(true);
  });
});

describe("Contract validation — Post", () => {
  const contractFields = Object.keys(postContract.fields);
  const adminOnlyFields = postContract.adminOnly;
  const zodFields = Object.keys(postSchema.shape);

  it("Zod schema covers every contract field", () => {
    // createdAt is auto-injected by Firestore, not in the form schema
    const formFields = contractFields.filter((f) => f !== "createdAt");
    for (const field of formFields) {
      expect(zodFields, `Admin schema missing contract field: ${field}`).toContain(field);
    }
  });

  it("contract covers every Zod schema field (excluding admin-only)", () => {
    const allContractFields = [...contractFields, ...adminOnlyFields];
    for (const field of zodFields) {
      expect(
        allContractFields,
        `Zod field '${field}' not declared in contract (add to fields or adminOnly)`,
      ).toContain(field);
    }
  });

  it("complete example passes Zod validation (without auto-injected fields)", () => {
    // Remove fields auto-injected by Firestore (not in form schema)
    const { createdAt, ...formData } = sessionContract.examples.complete as Record<string, unknown>;
    const result = postSchema.safeParse(postContract.examples.complete);
    expect(result.success, `Zod validation failed: ${JSON.stringify(result)}`).toBe(true);
  });

  it("minimal example passes Zod validation (without auto-injected fields)", () => {
    const { createdAt, ...formData } = postContract.examples.minimal as Record<string, unknown>;
    const result = postSchema.safeParse(formData);
    expect(result.success, `Zod validation failed: ${JSON.stringify(result)}`).toBe(true);
  });
});
