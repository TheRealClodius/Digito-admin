import { createEventListRoute } from "@/lib/event-route-helpers";

const config = {
  collectionName: "brands",
  allowedFields: ["name", "description", "logoUrl", "imageUrl", "websiteUrl", "isHighlighted"],
  requiredFields: ["name"],
  sortField: "name",
  sortDirection: 1 as const,
};

export const { GET, POST } = createEventListRoute(config);
