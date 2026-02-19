import { createEventListRoute } from "@/lib/event-route-helpers";

const config = {
  collectionName: "posts",
  allowedFields: ["title", "content", "imageUrl", "authorName", "authorAvatarUrl"],
  requiredFields: ["title"],
  sortField: "createdAt",
  sortDirection: -1 as const,
};

export const { GET, POST } = createEventListRoute(config);
