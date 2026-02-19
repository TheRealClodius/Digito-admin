import { createEventListRoute } from "@/lib/event-route-helpers";

const config = {
  collectionName: "happenings",
  allowedFields: ["name", "description", "startTime", "endTime", "location", "imageUrl"],
  requiredFields: ["name"],
  dateFields: ["startTime", "endTime"],
  sortField: "startTime",
  sortDirection: 1 as const,
};

export const { GET, POST } = createEventListRoute(config);
