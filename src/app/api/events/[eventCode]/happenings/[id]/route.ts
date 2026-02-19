import { createEventItemRoute } from "@/lib/event-route-helpers";

const config = {
  collectionName: "happenings",
  allowedFields: ["name", "description", "startTime", "endTime", "location", "imageUrl"],
  dateFields: ["startTime", "endTime"],
};

export const { GET, PUT, DELETE } = createEventItemRoute(config);
