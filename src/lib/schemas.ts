import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
});

export const eventSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  startDate: z.date({ message: "Start date is required" }),
  endDate: z.date({ message: "End date is required" }),
  logoUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional().or(z.literal("")),
  instagramUrl: z.string().url().nullable().optional().or(z.literal("")),
  chatPrompt: z.string().nullable().optional(),
  imageUrls: z.array(z.string()).optional().default([]),
  isActive: z.boolean().default(true),
});

export const brandSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional().or(z.literal("")),
  instagramUrl: z.string().url().nullable().optional().or(z.literal("")),
  stallNumber: z.string().nullable().optional(),
  isHighlighted: z.boolean().default(false),
});

export const standSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  hallOrZone: z.string().nullable().optional(),
  size: z.enum(["small", "medium", "large", "custom"]).nullable().optional(),
  brandId: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

export const sessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  startTime: z.date({ message: "Start time is required" }),
  endTime: z.date({ message: "End time is required" }),
  location: z.string().nullable().optional(),
  type: z.enum(["talk", "workshop", "panel", "networking", "other"]),
  speakerName: z.string().nullable().optional(),
  speakerBio: z.string().nullable().optional(),
  speakerAvatarUrl: z.string().nullable().optional(),
  participantId: z.string().nullable().optional(),
  requiresAccess: z.boolean().default(false),
  accessTier: z.enum(["regular", "premium", "vip", "staff"]).nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

export const happeningSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  startTime: z.date({ message: "Start time is required" }),
  endTime: z.date({ message: "End time is required" }),
  location: z.string().nullable().optional(),
  type: z.enum(["demo", "performance", "launch", "networking", "reception", "other"]),
  hostName: z.string().nullable().optional(),
  hostAvatarUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  brandId: z.string().nullable().optional(),
  isHighlighted: z.boolean().default(false),
  requiresAccess: z.boolean().default(false),
  accessTier: z.string().nullable().optional(),
});

export const participantSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().nullable().optional().or(z.literal("")),
  role: z.enum(["speaker", "panelist", "host", "brand_rep", "moderator", "performer", "other"]),
  company: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional().or(z.literal("")),
  linkedinUrl: z.string().url().nullable().optional().or(z.literal("")),
  brandId: z.string().nullable().optional(),
  sessionIds: z.array(z.string()).optional().default([]),
  happeningIds: z.array(z.string()).optional().default([]),
  isHighlighted: z.boolean().default(false),
});

export const postSchema = z.object({
  imageUrl: z.string().min(1, "Image is required"),
  description: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  authorAvatarUrl: z.string().nullable().optional(),
});

export const whitelistEntrySchema = z.object({
  email: z.string().email("Valid email is required").transform((v) => v.toLowerCase()),
  accessTier: z.enum(["regular", "premium", "vip", "staff"]).default("regular"),
  company: z.string().nullable().optional(),
  lockedFields: z.array(z.string()).optional().default([]),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
export type EventFormValues = z.infer<typeof eventSchema>;
export type BrandFormValues = z.infer<typeof brandSchema>;
export type StandFormValues = z.infer<typeof standSchema>;
export type SessionFormValues = z.infer<typeof sessionSchema>;
export type HappeningFormValues = z.infer<typeof happeningSchema>;
export type ParticipantFormValues = z.infer<typeof participantSchema>;
export type PostFormValues = z.infer<typeof postSchema>;
export type WhitelistEntryFormValues = z.infer<typeof whitelistEntrySchema>;
