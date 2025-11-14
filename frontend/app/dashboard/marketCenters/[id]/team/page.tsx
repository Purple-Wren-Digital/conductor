import MarketCenterAgentView from "@/components/ui/marketCenters/market-center-agent-view";

export default function MarketCenterTeamPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return <MarketCenterAgentView marketCenterId={id} />;
}
