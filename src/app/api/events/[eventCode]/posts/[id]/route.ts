import { createEventItemRoute } from "@/lib/event-route-helpers";

const config = {
  collectionName: "posts",
  allowedFields: ["title", "content", "imageUrl", "authorName", "authorAvatarUrl"],
};

export const { GET, PUT, DELETE } = createEventItemRoute(config);
