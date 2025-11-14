import MarketCenterAgentView from "@/components/ui/marketCenters/market-center-agent-view";

export default async function MarketCenterTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <MarketCenterAgentView marketCenterId={id} />;
}
