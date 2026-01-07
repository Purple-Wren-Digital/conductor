"use client";

import { useMemo, useState } from "react";
import PagesAndItemsCount from "@/components/ui/pagination/page-and-items-count";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { useFetchMarketCenterHistory } from "@/hooks/use-history";
import type { MarketCenterHistory, OrderBy } from "@/lib/types";
import { calculateTotalPages, capitalizeEveryWord } from "@/lib/utils";
import {
  ArrowRightLeft,
  CircleMinus,
  CirclePlus,
  Clipboard,
  LockIcon,
  Mailbox,
  MessageSquare,
  SquareCheckBig,
  SquarePen,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// TODO export table to computer - excel/google sheets ??

type FormattedMarketCenterHistory = MarketCenterHistory & {
  newValueLink?: string;
  previousValueLink?: string;
};

export default function MarketCenterHistory({
  marketCenterId,
}: {
  marketCenterId?: string;
}) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<OrderBy>("desc");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    params.append("orderBy", orderBy);
    params.append("limit", String(itemsPerPage));
    params.append("offset", String((currentPage - 1) * itemsPerPage));
    return params;
  }, [orderBy, currentPage, itemsPerPage]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );
  const marketCenterHistoryQueryKey = useMemo(
    () => ["market-center-history", marketCenterId, queryKeyParams] as const,
    [marketCenterId, queryKeyParams]
  );
  const { data: marketCenterHistoryData, isLoading } =
    useFetchMarketCenterHistory({
      id: marketCenterId,
      queryKey: marketCenterHistoryQueryKey,
      queryParams: queryParams,
    });

  const marketCenterHistoryLogs = useMemo(() => {
    return marketCenterHistoryData?.marketCenterHistory as MarketCenterHistory[];
  }, [marketCenterHistoryData]);
  const totalMarketCenterHistoryLogs: number = useMemo(() => {
    return marketCenterHistoryData?.total ?? 0;
  }, [marketCenterHistoryData]);
  const totalPages = calculateTotalPages({
    totalItems: totalMarketCenterHistoryLogs,
    itemsPerPage,
  });

  const processedLogs: FormattedMarketCenterHistory[] = useMemo(() => {
    if (!marketCenterHistoryLogs) return [];

    return marketCenterHistoryLogs.map((log: MarketCenterHistory) => {
      let newValue = "";
      let previousValue = "";
      let newValueLink = "";
      let previousValueLink = "";

      // New Value Parsing
      if (log?.field && log?.field?.includes("category") && log?.newValue) {
        try {
          const parsed = JSON.parse(log.newValue);
          newValue = parsed?.name ?? "-";
          newValueLink = parsed?.id ? `/dashboard/users/${parsed.id}` : "";
        } catch {
          newValue = log.newValue ?? "";
          newValueLink = "";
        }
      } else if (log?.field && log?.field?.includes("team") && log?.newValue) {
        try {
          const parsed = JSON.parse(log.newValue);
          newValue = parsed?.name ?? "-";
          newValueLink = parsed?.id ? `/dashboard/users/${parsed.id}` : "";
        } catch {
          newValue = log.newValue ?? "";
          newValueLink = "";
        }
      } else if (
        log?.field &&
        log?.field?.includes("autoClose") &&
        log?.newValue
      ) {
        const parsedNewValue: {
          enabled: boolean;
          awaitingResponseDays: number;
        } = JSON.parse(log.newValue);
        newValue = `${parsedNewValue?.enabled === true ? `${parsedNewValue.awaitingResponseDays} days` : "Disabled"}`;
      } else if (
        log?.action &&
        log?.action?.includes("INVITE") &&
        log?.newValue
      ) {
        const parsedNewValue: {
          status: string;
          email: string;
          userId: string | null;
        } = JSON.parse(log.newValue);
        newValue = `${parsedNewValue.status}`;
        newValueLink = "/dashboard/users/?tab=invitations";
      } else {
        newValue = log?.newValue ?? "-";
      }

      // Previous Value Parsing
      if (
        log?.field &&
        log?.field?.includes("category") &&
        log?.previousValue
      ) {
        try {
          const parsed = JSON.parse(log.previousValue);
          previousValue = parsed?.name ?? "-";
          previousValueLink = parsed?.id ? `/dashboard/users/${parsed.id}` : "";
        } catch {
          previousValue = log.previousValue;
          previousValueLink = "";
        }
      } else if (
        log?.field &&
        log?.field?.includes("team") &&
        log?.previousValue
      ) {
        try {
          const parsed = JSON.parse(log.previousValue);
          previousValue = parsed?.name ?? "-";
          previousValueLink = parsed?.id ? `/dashboard/users/${parsed.id}` : "";
        } catch {
          previousValue = log.previousValue;
          previousValueLink = "";
        }
      } else if (
        log?.field &&
        log?.field?.includes("autoClose") &&
        log?.previousValue
      ) {
        const parsedPreviousValue: {
          enabled: boolean;
          awaitingResponseDays: number;
        } = JSON.parse(log.previousValue);
        previousValue = `${parsedPreviousValue?.enabled === true ? `${parsedPreviousValue.awaitingResponseDays} days` : "Disabled"}`;
      } else if (
        log?.action &&
        log?.action?.includes("INVITE") &&
        log?.previousValue
      ) {
        const parsedPreviousValue: {
          status: string;
          email: string;
          userId: string | null;
        } = JSON.parse(log.previousValue);
        previousValue = `${parsedPreviousValue.status}`;
        previousValueLink = "/dashboard/users/?tab=invitations";
      } else {
        previousValue = log?.previousValue ?? "-";
      }

      return {
        ...log,
        newValue,
        previousValue,
        newValueLink,
        previousValueLink,
      };
    });
  }, [marketCenterHistoryLogs]);

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case "COMMENT":
        return <MessageSquare className="h-3 w-3" />;
      case "UPDATE":
        return <SquarePen className="h-3 w-3" />;
      case "DELETE":
        return <Trash2 className="h-3 w-3" />;
      case "INVITE":
        return <Mailbox className="h-3 w-3" />;
      case "ADD":
        return <CirclePlus className="h-3 w-3" />;
      case "REMOVE":
        return <CircleMinus className="h-3 w-3" />;
      case "ROLE CHANGE":
        return <ArrowRightLeft className="h-4 w-4" />;
      case "REOPEN":
      case "REOPENED":
        return <Undo2 className="h-3 w-3" />;
      case "CLOSE":
      case "CLOSED":
      case "AUTOCLOSE":
        return <LockIcon className="h-3 w-3" />;
      case "CREATE":
        return <SquareCheckBig className="h-3 w-3" />;
      default:
        return <Clipboard className="h-3 w-3" />;
    }
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-row items-center justify-between">
        <p className="text-lg font-bold m-4 ml-2">Recent Activity</p>
      </div>
      <div className="max-w-[300px] xs:max-w-full rounded-lg border">
        <Table className="overflow-scroll">
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Updated Data</TableHead>
              <TableHead>Previous Data</TableHead>
              <TableHead>Changed By</TableHead>
              <TableHead>Changed On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell className="text-muted-foreground col-span-full">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              (!marketCenterHistoryLogs || !marketCenterHistoryLogs.length) && (
                <TableRow>
                  <TableCell className="text-muted-foreground col-span-full">
                    No market center logs
                  </TableCell>
                </TableRow>
              )}

            {!isLoading &&
              processedLogs &&
              processedLogs.length > 0 &&
              processedLogs.map(
                (log: FormattedMarketCenterHistory, index: number) => {
                  const action =
                    log?.action !== "AUTOCLOSE" &&
                    log?.newValue &&
                    log?.newValue === "RESOLVED"
                      ? "CLOSE"
                      : log?.field === "comment"
                        ? "COMMENT"
                        : log?.action;

                  if (!log) return null;

                  return (
                    <TableRow key={log?.id + index}>
                      {/* ACTION */}
                      <TableCell className="flex gap-2 items-center font-semibold cursor-pointer capitalize">
                        {getActionIcon(action.split("_").join(" "))}
                        {action.split("_").join(" ").toLowerCase()}
                      </TableCell>
                      {/* FIELD */}
                      <TableCell className="font-semibold capitalize">
                        {log?.field
                          ? log.field.split("_").join(" ").toLowerCase()
                          : "Not found"}
                      </TableCell>
                      {/* NEW VALUE */}
                      <TableCell
                        className="font-semibold max-w-[50px] cursor-pointer"
                        onClick={() => {
                          if (log?.newValueLink) router.push(log.newValueLink);
                        }}
                      >
                        <ToolTip
                          content={`Updated${log?.field ? `${capitalizeEveryWord(log?.field.split("_").join(" ").toLowerCase())}` : ""}: ${log?.newValue}`}
                          trigger={
                            <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                              {log?.newValue}
                            </p>
                          }
                        />
                      </TableCell>
                      {/* PREVIOUS VALUE */}
                      <TableCell
                        className="text-muted-foreground max-w-[50px] cursor-pointer"
                        onClick={() => {
                          if (log?.previousValueLink)
                            router.push(log.previousValueLink);
                        }}
                      >
                        <ToolTip
                          content={`Previous${log?.field ? ` ${capitalizeEveryWord(log?.field)}` : ""}: ${log?.previousValue}`}
                          trigger={
                            <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                              {log?.previousValue}
                            </p>
                          }
                        />
                      </TableCell>
                      {/* CHANGED BY */}
                      <TableCell
                        className="font-medium"
                        onClick={() => {
                          if (log?.changedById === "SYSTEM") return;
                          if (log?.changedById) {
                            router.push(`/dashboard/users/${log.changedById}`);
                          } else {
                            toast.error("Error: User not found");
                          }
                        }}
                      >
                        {log?.changedById === "SYSTEM" ? (
                          "System"
                        ) : (
                          <ToolTip
                            content={`Changed By: ${
                              log?.changedBy && log?.changedBy?.name
                                ? log?.changedBy?.name
                                : log?.changedById
                                  ? log?.changedById.slice(0, 8)
                                  : "-"
                            }`}
                            trigger={
                              <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                                {log?.changedBy && log?.changedBy?.name
                                  ? log?.changedBy?.name
                                  : log?.changedById
                                    ? log?.changedById.slice(0, 8)
                                    : "Not found"}
                              </p>
                            }
                          />
                        )}
                      </TableCell>
                      {/* DATE CHANGED ON */}
                      <TableCell className="font-medium">
                        {log?.changedAt
                          ? new Date(log.changedAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                }
              )}
          </TableBody>
        </Table>
        <div className="p-2">
          <PagesAndItemsCount
            type="logs"
            totalItems={totalMarketCenterHistoryLogs}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
          />
        </div>
      </div>
    </div>
  );
}
