import * as React from "react";
import { Suspense } from "react";
import ReportsDashboard from "@/components/reports/reports-dashboard";

export default function ReportsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportsDashboard />
    </Suspense>
  );
}
