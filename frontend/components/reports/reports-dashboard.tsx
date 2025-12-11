"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SlaComplianceReport from "@/components/reports/sla-compliance-report";
import SlaComplianceByUsersReport from "@/components/reports/users-tickets-overdue-at-risk";
import TicketBacklogReport from "@/components/reports/backlog-report";
import CreatedVolumeByMonthReport from "@/components/reports/created-volume-report";
import ResolvedTicketsByMonthReport from "@/components/reports/resolved-volume-report";
import {
  ReportFilters,
  ReportFiltersState,
  DEFAULT_FILTERS,
} from "@/components/reports/report-filters";
import { Separator } from "@/components/ui/separator";

export type ReportProps = {
  isSelected: boolean;
  filters: ReportFiltersState;
};

const reportType = [
  { value: "sla-compliance", label: "SLA Compliance Overview" },
  {
    value: "sla-compliance-by-users",
    label: "SLA Compliance by Ticket Assignees",
  },
  { value: "ticket-backlog", label: "Ticket Backlog (Current)" },
  { value: "ticket-created-volume", label: "Created Tickets By Month" },
  { value: "ticket-resolved-volume", label: "Resolved Tickets By Month" },
];

export default function ReportsDashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string | null>(
    null
  );
  const [filters, setFilters] = useState<ReportFiltersState>(DEFAULT_FILTERS);

  // FILTERS STATE PERSISTENCE
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      "report-selection",
      JSON.stringify({
        selectedReportType,
        filters: {
          ...filters,
          // Convert dates to ISO strings for storage
          dateFrom: filters.dateFrom?.toISOString(),
          dateTo: filters.dateTo?.toISOString(),
        },
      })
    );
  }, [hydrated, selectedReportType, filters]);

  useEffect(() => {
    const filtersString = localStorage.getItem("report-selection");
    if (filtersString) {
      const fetchedFilters = JSON.parse(filtersString);
      setSelectedReportType(fetchedFilters.selectedReportType || "none");
      if (fetchedFilters.filters) {
        setFilters({
          ...fetchedFilters.filters,
          // Parse dates from ISO strings
          dateFrom: fetchedFilters.filters.dateFrom
            ? new Date(fetchedFilters.filters.dateFrom)
            : undefined,
          dateTo: fetchedFilters.filters.dateTo
            ? new Date(fetchedFilters.filters.dateTo)
            : undefined,
        });
      }
    }

    setHydrated(true);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#6D1C24]">
        Metrics and Reporting
      </h1>

      <div className="grid gap-4 lg:grid-cols-12 mt-10">
        <section className="lg:col-span-3 space-y-4">
          <p className="font-semibold">Reports</p>
          <Separator />

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <Button
              variant={"link"}
              size="sm"
              className="font-medium p-0 text-muted-foreground opacity-50 justify-start hover:text-[#6D1C24] hover:decoration-[#6D1C24]"
              onClick={() => setSelectedReportType("none")}
              disabled={!selectedReportType || selectedReportType === "none"}
            >
              {!selectedReportType || selectedReportType === "none"
                ? "Select a report"
                : "Select none"}
            </Button>
            {reportType.map((report) => (
              <Button
                key={report.value}
                variant={"link"}
                size="sm"
                className={`font-medium p-0 justify-start
                ${
                  selectedReportType === report.value
                    ? "text-primary"
                    : "text-muted-foreground hover:text-[#6D1C24] hover:decoration-[#6D1C24]"
                }`}
                onClick={() => setSelectedReportType(report?.value)}
              >
                {report.label}
              </Button>
            ))}
          </div>
        </section>
        <div className="lg:col-span-9 space-y-4">
          {selectedReportType ? (
            <>
              <ReportFilters
                filters={filters}
                onFiltersChange={setFilters}
                showDateFilter={[
                  "ticket-created-volume",
                  "ticket-resolved-volume",
                  "ticket-backlog",
                ].includes(selectedReportType)}
                showMarketCenterFilter={true}
                showCategoryFilter={true}
              />
              <Card className="space-y-4">
                <SlaComplianceReport
                  isSelected={selectedReportType === "sla-compliance"}
                  filters={filters}
                />
                <SlaComplianceByUsersReport
                  isSelected={selectedReportType === "sla-compliance-by-users"}
                  filters={filters}
                />
                <TicketBacklogReport
                  isSelected={selectedReportType === "ticket-backlog"}
                  filters={filters}
                />
                <CreatedVolumeByMonthReport
                  isSelected={selectedReportType === "ticket-created-volume"}
                  filters={filters}
                />
                <ResolvedTicketsByMonthReport
                  isSelected={selectedReportType === "ticket-resolved-volume"}
                  filters={filters}
                />
              </Card>
            </>
          ) : (
            <p className="flex items-center justify-center h-24 font-medium text-muted-foreground   ">
              Please make a selection
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
