import { createEventItemRoute } from "@/lib/event-route-helpers";

const config = {
  collectionName: "whitelist",
  allowedFields: [
    "email", "firstName", "lastName", "accessTier", "company",
    "jobTitle", "phone", "notes",
  ],
};

export const { GET, PUT, DELETE } = createEventItemRoute(config);
