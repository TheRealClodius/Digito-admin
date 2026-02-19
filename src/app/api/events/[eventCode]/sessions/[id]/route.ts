import { createEventItemRoute } from "@/lib/event-route-helpers";

const config = {
  collectionName: "sessions",
  allowedFields: ["name", "description", "startTime", "endTime", "location", "speaker"],
  dateFields: ["startTime", "endTime"],
};

export const { GET, PUT, DELETE } = createEventItemRoute(config);
