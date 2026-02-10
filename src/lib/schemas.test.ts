import { describe, it, expect } from "vitest";
import {
  clientSchema,
  eventSchema,
  brandSchema,
  standSchema,
  sessionSchema,
  happeningSchema,
  participantSchema,
  postSchema,
  whitelistEntrySchema,
} from "@/lib/schemas";

// ---------------------------------------------------------------------------
// clientSchema
// ---------------------------------------------------------------------------
describe("clientSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = clientSchema.safeParse({
      name: "Acme Corp",
      description: "A great company",
      logoUrl: "https://example.com/logo.png",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Acme Corp");
      expect(result.data.description).toBe("A great company");
      expect(result.data.logoUrl).toBe("https://example.com/logo.png");
    }
  });

  it("accepts valid input with only required fields", () => {
    const result = clientSchema.safeParse({ name: "Acme Corp" });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = clientSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty string name", () => {
    const result = clientSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts null for description", () => {
    const result = clientSchema.safeParse({ name: "X", description: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeNull();
  });

  it("accepts undefined for description", () => {
    const result = clientSchema.safeParse({ name: "X" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeUndefined();
  });

  it("accepts null for logoUrl", () => {
    const result = clientSchema.safeParse({ name: "X", logoUrl: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.logoUrl).toBeNull();
  });

  it("accepts undefined for logoUrl", () => {
    const result = clientSchema.safeParse({ name: "X" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.logoUrl).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// eventSchema
// ---------------------------------------------------------------------------
describe("eventSchema", () => {
  const validEvent = {
    clientId: "client-1",
    name: "Launch Party",
    startDate: new Date("2025-06-01"),
    endDate: new Date("2025-06-02"),
  };

  it("accepts a minimal valid event", () => {
    const result = eventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Launch Party");
      expect(result.data.clientId).toBe("client-1");
      expect(result.data.isActive).toBeUndefined();
      expect(result.data.imageUrls).toBeUndefined();
    }
  });

  it("accepts all fields populated", () => {
    const result = eventSchema.safeParse({
      ...validEvent,
      description: "An awesome event",
      venue: "Convention Center",
      logoUrl: "https://example.com/logo.png",
      bannerUrl: "https://example.com/banner.png",
      websiteUrl: "https://example.com",
      instagramUrl: "https://instagram.com/event",
      chatPrompt: "Welcome to the event!",
      imageUrls: ["https://example.com/img1.png", "https://example.com/img2.png"],
      isActive: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
      expect(result.data.imageUrls).toEqual([
        "https://example.com/img1.png",
        "https://example.com/img2.png",
      ]);
      expect(result.data.chatPrompt).toBe("Welcome to the event!");
    }
  });

  // --- Required fields ---

  it("rejects missing name", () => {
    const { name: _, ...rest } = validEvent;
    expect(eventSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(eventSchema.safeParse({ ...validEvent, name: "" }).success).toBe(false);
  });

  it("rejects missing clientId", () => {
    const { clientId: _, ...rest } = validEvent;
    expect(eventSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty clientId", () => {
    expect(eventSchema.safeParse({ ...validEvent, clientId: "" }).success).toBe(false);
  });

  it("rejects missing startDate", () => {
    const { startDate: _, ...rest } = validEvent;
    expect(eventSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing endDate", () => {
    const { endDate: _, ...rest } = validEvent;
    expect(eventSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects non-Date value for startDate", () => {
    expect(eventSchema.safeParse({ ...validEvent, startDate: "not-a-date" }).success).toBe(false);
  });

  it("rejects non-Date value for endDate", () => {
    expect(eventSchema.safeParse({ ...validEvent, endDate: 12345 }).success).toBe(false);
  });

  // --- URL fields ---

  it("accepts valid URL for websiteUrl", () => {
    const result = eventSchema.safeParse({ ...validEvent, websiteUrl: "https://example.com" });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for websiteUrl", () => {
    const result = eventSchema.safeParse({ ...validEvent, websiteUrl: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.websiteUrl).toBe("");
  });

  it("accepts null for websiteUrl", () => {
    const result = eventSchema.safeParse({ ...validEvent, websiteUrl: null });
    expect(result.success).toBe(true);
  });

  it("rejects invalid websiteUrl", () => {
    expect(eventSchema.safeParse({ ...validEvent, websiteUrl: "not-a-url" }).success).toBe(false);
  });

  it("accepts valid URL for instagramUrl", () => {
    const result = eventSchema.safeParse({
      ...validEvent,
      instagramUrl: "https://instagram.com/test",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for instagramUrl", () => {
    const result = eventSchema.safeParse({ ...validEvent, instagramUrl: "" });
    expect(result.success).toBe(true);
  });

  it("accepts null for instagramUrl", () => {
    const result = eventSchema.safeParse({ ...validEvent, instagramUrl: null });
    expect(result.success).toBe(true);
  });

  it("rejects invalid instagramUrl", () => {
    expect(eventSchema.safeParse({ ...validEvent, instagramUrl: "bad" }).success).toBe(false);
  });

  // --- Optional nullable fields ---

  it("accepts null for description", () => {
    const result = eventSchema.safeParse({ ...validEvent, description: null });
    expect(result.success).toBe(true);
  });

  it("accepts null for venue", () => {
    const result = eventSchema.safeParse({ ...validEvent, venue: null });
    expect(result.success).toBe(true);
  });

  it("accepts null for logoUrl", () => {
    const result = eventSchema.safeParse({ ...validEvent, logoUrl: null });
    expect(result.success).toBe(true);
  });

  it("accepts null for bannerUrl", () => {
    const result = eventSchema.safeParse({ ...validEvent, bannerUrl: null });
    expect(result.success).toBe(true);
  });

  // --- chatPrompt (new field) ---

  it("accepts a string for chatPrompt", () => {
    const result = eventSchema.safeParse({ ...validEvent, chatPrompt: "Hello!" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.chatPrompt).toBe("Hello!");
  });

  it("accepts null for chatPrompt", () => {
    const result = eventSchema.safeParse({ ...validEvent, chatPrompt: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.chatPrompt).toBeNull();
  });

  it("accepts undefined (omitted) for chatPrompt", () => {
    const result = eventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.chatPrompt).toBeUndefined();
  });

  // --- imageUrls (new field) ---

  it("leaves imageUrls undefined when omitted", () => {
    const result = eventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.imageUrls).toBeUndefined();
  });

  it("accepts a populated imageUrls array", () => {
    const urls = ["https://a.com/1.png", "https://b.com/2.png"];
    const result = eventSchema.safeParse({ ...validEvent, imageUrls: urls });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.imageUrls).toEqual(urls);
  });

  it("rejects imageUrls with non-string elements", () => {
    expect(eventSchema.safeParse({ ...validEvent, imageUrls: [123] }).success).toBe(false);
  });

  // --- isActive default ---

  it("leaves isActive undefined when omitted", () => {
    const result = eventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isActive).toBeUndefined();
  });

  it("allows isActive to be explicitly false", () => {
    const result = eventSchema.safeParse({ ...validEvent, isActive: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// brandSchema
// ---------------------------------------------------------------------------
describe("brandSchema", () => {
  it("accepts valid input with only required fields", () => {
    const result = brandSchema.safeParse({ name: "BrandX" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("BrandX");
      expect(result.data.isHighlighted).toBeUndefined();
    }
  });

  it("accepts all fields populated", () => {
    const result = brandSchema.safeParse({
      name: "BrandX",
      description: "Desc",
      logoUrl: "https://example.com/logo.png",
      imageUrl: "https://example.com/img.png",
      videoUrl: "https://example.com/vid.mp4",
      websiteUrl: "https://example.com",
      instagramUrl: "https://instagram.com/brandx",
      stallNumber: "A42",
      isHighlighted: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isHighlighted).toBe(true);
      expect(result.data.instagramUrl).toBe("https://instagram.com/brandx");
    }
  });

  // --- Required fields ---

  it("rejects missing name", () => {
    expect(brandSchema.safeParse({}).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(brandSchema.safeParse({ name: "" }).success).toBe(false);
  });

  // --- websiteUrl ---

  it("accepts valid websiteUrl", () => {
    const result = brandSchema.safeParse({ name: "B", websiteUrl: "https://example.com" });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for websiteUrl", () => {
    const result = brandSchema.safeParse({ name: "B", websiteUrl: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.websiteUrl).toBe("");
  });

  it("accepts null for websiteUrl", () => {
    const result = brandSchema.safeParse({ name: "B", websiteUrl: null });
    expect(result.success).toBe(true);
  });

  it("rejects invalid websiteUrl", () => {
    expect(brandSchema.safeParse({ name: "B", websiteUrl: "nope" }).success).toBe(false);
  });

  // --- instagramUrl (newly added field) ---

  it("accepts valid instagramUrl", () => {
    const result = brandSchema.safeParse({
      name: "B",
      instagramUrl: "https://instagram.com/brandx",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.instagramUrl).toBe("https://instagram.com/brandx");
  });

  it("accepts empty string for instagramUrl", () => {
    const result = brandSchema.safeParse({ name: "B", instagramUrl: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.instagramUrl).toBe("");
  });

  it("accepts null for instagramUrl", () => {
    const result = brandSchema.safeParse({ name: "B", instagramUrl: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.instagramUrl).toBeNull();
  });

  it("accepts undefined (omitted) for instagramUrl", () => {
    const result = brandSchema.safeParse({ name: "B" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.instagramUrl).toBeUndefined();
  });

  it("rejects invalid instagramUrl", () => {
    expect(brandSchema.safeParse({ name: "B", instagramUrl: "not-a-url" }).success).toBe(false);
  });

  // --- isHighlighted default ---

  it("leaves isHighlighted undefined when not provided", () => {
    const result = brandSchema.safeParse({ name: "B" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isHighlighted).toBeUndefined();
  });

  it("allows isHighlighted to be explicitly true", () => {
    const result = brandSchema.safeParse({ name: "B", isHighlighted: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isHighlighted).toBe(true);
  });

  // --- Other optional nullable fields ---

  it("accepts null for description, logoUrl, imageUrl, videoUrl, stallNumber", () => {
    const result = brandSchema.safeParse({
      name: "B",
      description: null,
      logoUrl: null,
      imageUrl: null,
      videoUrl: null,
      stallNumber: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// standSchema
// ---------------------------------------------------------------------------
describe("standSchema", () => {
  it("accepts valid input with only required fields", () => {
    const result = standSchema.safeParse({ name: "Stand A" });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    expect(standSchema.safeParse({}).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(standSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts valid size enum values", () => {
    for (const size of ["small", "medium", "large", "custom"]) {
      const result = standSchema.safeParse({ name: "S", size });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid size enum value", () => {
    expect(standSchema.safeParse({ name: "S", size: "huge" }).success).toBe(false);
  });

  it("accepts null for size", () => {
    const result = standSchema.safeParse({ name: "S", size: null });
    expect(result.success).toBe(true);
  });

  it("accepts null for optional nullable fields", () => {
    const result = standSchema.safeParse({
      name: "S",
      description: null,
      hallOrZone: null,
      brandId: null,
      imageUrl: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sessionSchema
// ---------------------------------------------------------------------------
describe("sessionSchema", () => {
  const validSession = {
    title: "Keynote",
    startTime: new Date("2025-06-01T09:00:00"),
    endTime: new Date("2025-06-01T10:00:00"),
    type: "talk" as const,
  };

  it("accepts valid input with required fields", () => {
    const result = sessionSchema.safeParse(validSession);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiresRegistration).toBeUndefined();
      expect(result.data.requiresVIPAccess).toBeUndefined();
    }
  });

  it("rejects missing title", () => {
    const { title: _, ...rest } = validSession;
    expect(sessionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty title", () => {
    expect(sessionSchema.safeParse({ ...validSession, title: "" }).success).toBe(false);
  });

  it("rejects missing startTime", () => {
    const { startTime: _, ...rest } = validSession;
    expect(sessionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing endTime", () => {
    const { endTime: _, ...rest } = validSession;
    expect(sessionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing type", () => {
    const { type: _, ...rest } = validSession;
    expect(sessionSchema.safeParse(rest).success).toBe(false);
  });

  it("accepts all valid type enum values", () => {
    for (const type of ["talk", "workshop", "panel", "networking", "other"]) {
      expect(sessionSchema.safeParse({ ...validSession, type }).success).toBe(true);
    }
  });

  it("rejects invalid type enum value", () => {
    expect(sessionSchema.safeParse({ ...validSession, type: "meetup" }).success).toBe(false);
  });

  it("accepts requiresRegistration boolean", () => {
    expect(sessionSchema.safeParse({ ...validSession, requiresRegistration: true }).success).toBe(true);
    expect(sessionSchema.safeParse({ ...validSession, requiresRegistration: false }).success).toBe(true);
  });

  it("accepts requiresVIPAccess boolean", () => {
    expect(sessionSchema.safeParse({ ...validSession, requiresVIPAccess: true }).success).toBe(true);
    expect(sessionSchema.safeParse({ ...validSession, requiresVIPAccess: false }).success).toBe(true);
  });

  it("leaves requiresRegistration and requiresVIPAccess undefined when not provided", () => {
    const result = sessionSchema.safeParse(validSession);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiresRegistration).toBeUndefined();
      expect(result.data.requiresVIPAccess).toBeUndefined();
    }
  });

  it("accepts null for optional nullable fields", () => {
    const result = sessionSchema.safeParse({
      ...validSession,
      description: null,
      location: null,
      speakerName: null,
      speakerBio: null,
      speakerAvatarUrl: null,
      participantId: null,
      imageUrl: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// happeningSchema
// ---------------------------------------------------------------------------
describe("happeningSchema", () => {
  const validHappening = {
    title: "Product Launch",
    startTime: new Date("2025-06-01T14:00:00"),
    endTime: new Date("2025-06-01T15:00:00"),
    type: "launch" as const,
  };

  it("accepts valid input with required fields", () => {
    const result = happeningSchema.safeParse(validHappening);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isHighlighted).toBeUndefined();
      expect(result.data.requiresAccess).toBeUndefined();
    }
  });

  it("rejects missing title", () => {
    const { title: _, ...rest } = validHappening;
    expect(happeningSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty title", () => {
    expect(happeningSchema.safeParse({ ...validHappening, title: "" }).success).toBe(false);
  });

  it("rejects missing startTime", () => {
    const { startTime: _, ...rest } = validHappening;
    expect(happeningSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing endTime", () => {
    const { endTime: _, ...rest } = validHappening;
    expect(happeningSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing type", () => {
    const { type: _, ...rest } = validHappening;
    expect(happeningSchema.safeParse(rest).success).toBe(false);
  });

  it("accepts all valid type enum values", () => {
    for (const type of ["demo", "performance", "launch", "networking", "reception", "other"]) {
      expect(happeningSchema.safeParse({ ...validHappening, type }).success).toBe(true);
    }
  });

  it("rejects invalid type enum value", () => {
    expect(happeningSchema.safeParse({ ...validHappening, type: "concert" }).success).toBe(false);
  });

  it("leaves isHighlighted undefined when not provided", () => {
    const result = happeningSchema.safeParse(validHappening);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isHighlighted).toBeUndefined();
  });

  it("leaves requiresAccess undefined when not provided", () => {
    const result = happeningSchema.safeParse(validHappening);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.requiresAccess).toBeUndefined();
  });

  it("accepts null for optional nullable fields", () => {
    const result = happeningSchema.safeParse({
      ...validHappening,
      description: null,
      location: null,
      hostName: null,
      hostAvatarUrl: null,
      imageUrl: null,
      brandId: null,
      accessTier: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// participantSchema
// ---------------------------------------------------------------------------
describe("participantSchema", () => {
  const validParticipant = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    role: "speaker" as const,
  };

  it("accepts valid input with required fields", () => {
    const result = participantSchema.safeParse(validParticipant);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionIds).toBeUndefined();
      expect(result.data.happeningIds).toBeUndefined();
      expect(result.data.isHighlighted).toBeUndefined();
    }
  });

  it("rejects missing firstName", () => {
    const { firstName: _, ...rest } = validParticipant;
    expect(participantSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty firstName", () => {
    expect(participantSchema.safeParse({ ...validParticipant, firstName: "" }).success).toBe(false);
  });

  it("rejects missing lastName", () => {
    const { lastName: _, ...rest } = validParticipant;
    expect(participantSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty lastName", () => {
    expect(participantSchema.safeParse({ ...validParticipant, lastName: "" }).success).toBe(false);
  });

  it("rejects missing role", () => {
    const { role: _, ...rest } = validParticipant;
    expect(participantSchema.safeParse(rest).success).toBe(false);
  });

  it("accepts all valid role enum values", () => {
    for (const role of [
      "speaker",
      "panelist",
      "host",
      "brand_rep",
      "moderator",
      "performer",
      "other",
    ]) {
      expect(participantSchema.safeParse({ ...validParticipant, role }).success).toBe(true);
    }
  });

  it("rejects invalid role", () => {
    expect(participantSchema.safeParse({ ...validParticipant, role: "admin" }).success).toBe(false);
  });

  // --- email ---

  it("accepts valid email", () => {
    const result = participantSchema.safeParse({
      ...validParticipant,
      email: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty string for email", () => {
    const result = participantSchema.safeParse({ ...validParticipant, email: "" });
    expect(result.success).toBe(false);
  });

  it("rejects null for email", () => {
    const result = participantSchema.safeParse({ ...validParticipant, email: null });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(participantSchema.safeParse({ ...validParticipant, email: "not-email" }).success).toBe(
      false,
    );
  });

  // --- URL fields ---

  it("accepts valid websiteUrl", () => {
    const result = participantSchema.safeParse({
      ...validParticipant,
      websiteUrl: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for websiteUrl", () => {
    const result = participantSchema.safeParse({ ...validParticipant, websiteUrl: "" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid websiteUrl", () => {
    expect(
      participantSchema.safeParse({ ...validParticipant, websiteUrl: "bad" }).success,
    ).toBe(false);
  });

  it("accepts valid linkedinUrl", () => {
    const result = participantSchema.safeParse({
      ...validParticipant,
      linkedinUrl: "https://linkedin.com/in/jane",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for linkedinUrl", () => {
    const result = participantSchema.safeParse({ ...validParticipant, linkedinUrl: "" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid linkedinUrl", () => {
    expect(
      participantSchema.safeParse({ ...validParticipant, linkedinUrl: "bad" }).success,
    ).toBe(false);
  });

  // --- Array defaults ---

  it("leaves sessionIds undefined when not provided", () => {
    const result = participantSchema.safeParse(validParticipant);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sessionIds).toBeUndefined();
  });

  it("accepts populated sessionIds", () => {
    const result = participantSchema.safeParse({
      ...validParticipant,
      sessionIds: ["s1", "s2"],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sessionIds).toEqual(["s1", "s2"]);
  });

  it("leaves happeningIds undefined when not provided", () => {
    const result = participantSchema.safeParse(validParticipant);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.happeningIds).toBeUndefined();
  });

  it("leaves isHighlighted undefined when not provided", () => {
    const result = participantSchema.safeParse(validParticipant);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isHighlighted).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// postSchema
// ---------------------------------------------------------------------------
describe("postSchema", () => {
  it("accepts valid input with only required fields", () => {
    const result = postSchema.safeParse({ imageUrl: "https://example.com/img.png" });
    expect(result.success).toBe(true);
  });

  it("rejects missing imageUrl", () => {
    expect(postSchema.safeParse({}).success).toBe(false);
  });

  it("rejects empty imageUrl", () => {
    expect(postSchema.safeParse({ imageUrl: "" }).success).toBe(false);
  });

  it("accepts null for optional nullable fields", () => {
    const result = postSchema.safeParse({
      imageUrl: "https://example.com/img.png",
      description: null,
      authorName: null,
      authorAvatarUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all fields populated", () => {
    const result = postSchema.safeParse({
      imageUrl: "https://example.com/img.png",
      description: "A cool post",
      authorName: "John",
      authorAvatarUrl: "https://example.com/avatar.png",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// whitelistEntrySchema
// ---------------------------------------------------------------------------
describe("whitelistEntrySchema", () => {
  it("accepts valid email and transforms to lowercase", () => {
    const result = whitelistEntrySchema.safeParse({ email: "Test@Example.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
      expect(result.data.accessTier).toBeUndefined();
      expect(result.data.lockedFields).toBeUndefined();
    }
  });

  it("rejects missing email", () => {
    expect(whitelistEntrySchema.safeParse({}).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(whitelistEntrySchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  it("transforms email to lowercase", () => {
    const result = whitelistEntrySchema.safeParse({ email: "FOO@BAR.COM" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("foo@bar.com");
  });

  it("accepts all valid accessTier values", () => {
    for (const accessTier of ["regular", "premium", "vip", "staff"]) {
      const result = whitelistEntrySchema.safeParse({ email: "a@b.com", accessTier });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.accessTier).toBe(accessTier);
    }
  });

  it("rejects invalid accessTier", () => {
    expect(
      whitelistEntrySchema.safeParse({ email: "a@b.com", accessTier: "gold" }).success,
    ).toBe(false);
  });

  it("leaves accessTier undefined when not provided", () => {
    const result = whitelistEntrySchema.safeParse({ email: "a@b.com" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.accessTier).toBeUndefined();
  });

  it("leaves lockedFields undefined when not provided", () => {
    const result = whitelistEntrySchema.safeParse({ email: "a@b.com" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.lockedFields).toBeUndefined();
  });

  it("accepts populated lockedFields", () => {
    const result = whitelistEntrySchema.safeParse({
      email: "a@b.com",
      lockedFields: ["email", "role"],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.lockedFields).toEqual(["email", "role"]);
  });

  it("accepts null for company", () => {
    const result = whitelistEntrySchema.safeParse({ email: "a@b.com", company: null });
    expect(result.success).toBe(true);
  });

  it("accepts a string for company", () => {
    const result = whitelistEntrySchema.safeParse({ email: "a@b.com", company: "Acme" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.company).toBe("Acme");
  });
});
