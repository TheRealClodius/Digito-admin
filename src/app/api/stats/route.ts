import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { getClientsCollection, getClientEventsCollection } from "@/lib/mongodb-collections";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const [clientsCol, eventsCol] = await Promise.all([
    getClientsCollection(),
    getClientEventsCollection(),
  ]);

  const [totalClients, totalEvents, activeEvents] = await Promise.all([
    clientsCol.countDocuments(),
    eventsCol.countDocuments(),
    eventsCol.countDocuments({ isActive: true }),
  ]);

  return NextResponse.json({ totalClients, totalEvents, activeEvents });
}
