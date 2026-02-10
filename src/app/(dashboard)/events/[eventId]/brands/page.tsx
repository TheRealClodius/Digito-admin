import { redirect } from "next/navigation";

export default async function BrandsRedirectPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/events/${eventId}/stands`);
}
