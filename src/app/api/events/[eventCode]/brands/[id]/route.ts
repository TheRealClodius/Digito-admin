import { createEventItemRoute } from "@/lib/event-route-helpers";

const config = {
  collectionName: "brands",
  allowedFields: ["name", "description", "logoUrl", "imageUrl", "websiteUrl", "isHighlighted"],
};

export const { GET, PUT, DELETE } = createEventItemRoute(config);
