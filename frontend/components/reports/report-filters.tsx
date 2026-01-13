"use client";

import React, { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CalendarIcon, X, Filter } from "lucide-react";
import {
  format,
  subDays,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
} from "date-fns";
import { cn } from "@/lib/cn";
import {
  useFetchAllMarketCenters,
  useFetchMarketCenterCategories,
} from "@/hooks/use-market-center";
import { useStore } from "@/context/store-provider";
import type { MarketCenter, TicketCategory } from "@/lib/types";

export type DatePreset = {
  label: string;
  value: string;
  getRange: () => { from: Date; to: Date };
};

export const DATE_PRESETS: DatePreset[] = [
  {
    label: "Last 7 days",
    value: "7d",
    getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    label: "Last 30 days",
    value: "30d",
    getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
  {
    label: "Last 90 days",
    value: "90d",
    getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }),
  },
  {
    label: "This month",
    value: "this_month",
    getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }),
  },
  {
    label: "Last month",
    value: "last_month",
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
      };
    },
  },
  {
    label: "This quarter",
    value: "this_quarter",
    getRange: () => ({ from: startOfQuarter(new Date()), to: new Date() }),
  },
  {
    label: "This year",
    value: "this_year",
    getRange: () => ({ from: startOfYear(new Date()), to: new Date() }),
  },
  {
    label: "Last 6 months",
    value: "6m",
    getRange: () => ({ from: subMonths(new Date(), 6), to: new Date() }),
  },
  {
    label: "Last 12 months",
    value: "12m",
    getRange: () => ({ from: subMonths(new Date(), 12), to: new Date() }),
  },
];

export type ReportFiltersState = {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  selectedPreset: string | undefined;
  marketCenterIds: string[];
  categoryIds: string[];
};

type ReportFiltersProps = {
  filters: ReportFiltersState;
  onFiltersChange: (filters: ReportFiltersState) => void;
  showDateFilter?: boolean;
  showMarketCenterFilter?: boolean;
  showCategoryFilter?: boolean;
};

export const DEFAULT_FILTERS: ReportFiltersState = {
  dateFrom: undefined,
  dateTo: undefined,
  selectedPreset: undefined,
  marketCenterIds: [],
  categoryIds: [],
};

export function ReportFilters({
  filters,
  onFiltersChange,
  showDateFilter = true,
  showMarketCenterFilter = true,
  showCategoryFilter = true,
}: ReportFiltersProps) {
  const { currentUser } = useStore();

  // Fetch market centers
  const { data: marketCentersData } = useFetchAllMarketCenters(
    currentUser?.role
  );
  const marketCenters: MarketCenter[] = marketCentersData?.marketCenters || [];

  // Set default market center for non-ADMIN users
  useEffect(() => {
    if (
      currentUser &&
      currentUser.role !== "ADMIN" &&
      currentUser.marketCenterId &&
      filters.marketCenterIds.length === 0
    ) {
      onFiltersChange({
        ...filters,
        marketCenterIds: [currentUser.marketCenterId],
      });
    }
  }, [currentUser, filters.marketCenterIds.length]);

  // Fetch categories (if a market center is selected, fetch its categories, otherwise fetch all)
  const selectedMarketCenterId =
    filters.marketCenterIds.length === 1
      ? filters.marketCenterIds[0]
      : undefined;
  const { data: categoriesData } = useFetchMarketCenterCategories(
    selectedMarketCenterId
  );
  const categories: TicketCategory[] = categoriesData?.ticketCategories || [];

  const hasActiveFilters = useMemo(() => {
    return (
      filters.dateFrom !== undefined ||
      filters.dateTo !== undefined ||
      filters.marketCenterIds.length > 0 ||
      filters.categoryIds.length > 0
    );
  }, [filters]);

  const handlePresetChange = (presetValue: string) => {
    if (presetValue === "custom") {
      onFiltersChange({
        ...filters,
        selectedPreset: "custom",
      });
      return;
    }

    const preset = DATE_PRESETS.find((p) => p.value === presetValue);
    if (preset) {
      const range = preset.getRange();
      onFiltersChange({
        ...filters,
        dateFrom: range.from,
        dateTo: range.to,
        selectedPreset: presetValue,
      });
    }
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateFrom: date,
      selectedPreset: "custom",
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateTo: date,
      selectedPreset: "custom",
    });
  };

  const handleMarketCenterChange = (marketCenterId: string) => {
    if (marketCenterId === "all") {
      onFiltersChange({
        ...filters,
        marketCenterIds: [],
        categoryIds: [], // Clear categories when market center changes
      });
    } else {
      onFiltersChange({
        ...filters,
        marketCenterIds: [marketCenterId],
        categoryIds: [], // Clear categories when market center changes
      });
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === "all") {
      onFiltersChange({
        ...filters,
        categoryIds: [],
      });
    } else {
      onFiltersChange({
        ...filters,
        categoryIds: [categoryId],
      });
    }
  };

  const clearFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="w-4 h-4" />
          Filters
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Date Range Filter */}
        {showDateFilter && (
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Time Period</Label>
            <div className="flex flex-wrap items-center gap-2">
              {/* Preset Selector */}
              <Select
                value={filters.selectedPreset || ""}
                onValueChange={handlePresetChange}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>

              {/* Date From */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[130px] h-9 justify-start text-left font-normal",
                      !filters.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom
                      ? format(filters.dateFrom, "MMM d, yyyy")
                      : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={handleDateFromChange}
                    disabled={(date) =>
                      date > new Date() ||
                      (filters.dateTo ? date > filters.dateTo : false)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">to</span>

              {/* Date To */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[130px] h-9 justify-start text-left font-normal",
                      !filters.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo
                      ? format(filters.dateTo, "MMM d, yyyy")
                      : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={handleDateToChange}
                    disabled={(date) =>
                      date > new Date() ||
                      (filters.dateFrom ? date < filters.dateFrom : false)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Market Center Filter */}
        {showMarketCenterFilter && marketCenters.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Market Center
            </Label>
            <Select
              value={filters.marketCenterIds[0] || "all"}
              onValueChange={handleMarketCenterChange}
              disabled={currentUser?.role !== "ADMIN"}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="All Market Centers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Market Centers</SelectItem>
                {marketCenters.map((mc) => (
                  <SelectItem key={mc.id} value={mc.id}>
                    {mc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Category Filter */}
        {showCategoryFilter && categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select
              value={filters.categoryIds[0] || "all"}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
