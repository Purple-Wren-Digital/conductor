import { TicketDetailView } from "@/components/ui/tickets/ticket-detail-view";

export default async function DashboardTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; 
  return <TicketDetailView ticketId={id} />;
}
