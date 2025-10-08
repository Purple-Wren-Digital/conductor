import MarketCenterDetailView from "@/components/ui/marketCenters/market-center-details/market-center-detail-view";

export default async function MarketCenterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MarketCenterDetailView marketCenterId={id} />;
}
