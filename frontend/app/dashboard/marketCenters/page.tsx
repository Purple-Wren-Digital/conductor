import MarketCenterManagement from "@/components/ui/marketCenters/market-center-management";

export default function MarketCentersPage() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Admin — Market Centers
        </h1>
        <p className="text-muted-foreground">
          Create and manage all market centers
        </p>
      </div>
      <MarketCenterManagement />
    </div>
  );
}
