import { createEventListRoute } from "@/lib/event-route-helpers";

const config = {
  collectionName: "sessions",
  allowedFields: ["name", "description", "startTime", "endTime", "location", "speaker"],
  requiredFields: ["name"],
  dateFields: ["startTime", "endTime"],
  sortField: "startTime",
  sortDirection: 1 as const,
};

export const { GET, POST } = createEventListRoute(config);
