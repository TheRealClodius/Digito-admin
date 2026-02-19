import { redirect } from "next/navigation";

export default async function BrandsRedirectPage({
  params,
}: {
  params: Promise<{ eventCode: string }>;
}) {
  const { eventCode } = await params;
  redirect(`/events/${eventCode}/stands`);
}
