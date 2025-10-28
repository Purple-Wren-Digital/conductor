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
  Mailbox,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// TODO export table to computer - excel/google sheets ??

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

  const marketCenterHistoryLogs =
    marketCenterHistoryData?.marketCenterHistory as MarketCenterHistory[];
  const totalMarketCenterHistoryLogs: number =
    marketCenterHistoryData?.total ?? 0;
  const totalPages = calculateTotalPages({
    totalItems: totalMarketCenterHistoryLogs,
    itemsPerPage,
  });

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE":
        return <Clipboard className="h-3 w-3" />;
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
              marketCenterHistoryLogs &&
              marketCenterHistoryLogs.length > 0 &&
              marketCenterHistoryLogs.map(
                (log: MarketCenterHistory, index: number) => {
                  let newValue = "";
                  let newValueLink = "";
                  let previousValue = "";
                  let previousValueLink = "";
                  if (
                    log.field === "category default assignee" &&
                    log.newValue
                  ) {
                    const parsedNewValue = JSON.parse(log.newValue);
                    newValue = parsedNewValue?.name;
                    newValueLink = `/dashboard/users/${parsedNewValue?.id}`;
                  } else if (log?.field === "team" && log?.newValue) {
                    const parsedNewValue = JSON.parse(log.newValue);
                    newValue = parsedNewValue?.name;
                    newValueLink = `/dashboard/users/${parsedNewValue?.id}`;
                  } else if (
                    log.field === "category default assignee" &&
                    log.previousValue
                  ) {
                    const parsedPreviousValue = JSON.parse(log.previousValue);
                    previousValue = parsedPreviousValue?.name;
                    previousValueLink = `/dashboard/users/${parsedPreviousValue?.id}`;
                  } else if (log?.field === "team" && log?.previousValue) {
                    const parsedPreviousValue = JSON.parse(log.previousValue);
                    previousValue = parsedPreviousValue?.name;
                    previousValueLink = `/dashboard/users/${parsedPreviousValue?.id}`;
                  } else {
                    newValue = log?.newValue ?? "N/a";
                    previousValue = log?.previousValue ?? "N/a";
                  }

                  // const categoryNewAssignee =
                  //   log?.field === "category default assignee" && log?.newValue;
                  // const categoryChangeNewAssignee =
                  //   log?.newValue &&
                  //   categoryNewAssignee &&
                  //   JSON.parse(log.newValue);

                  // const categoryPrevAssignee =
                  // const teamNewValue = log?.field === "team" && log?.newValue;
                  // const teamChangeNewValue =
                  //   log?.newValue && teamNewValue && JSON.parse(log.newValue);

                  // const teamPrevValue =
                  //   log?.field === "team" && log?.previousValue;
                  // const teamChangePrevValue =
                  //   log?.previousValue &&
                  //   teamPrevValue &&
                  //   JSON.parse(log.previousValue);
                  return (
                    <TableRow key={log?.id + index}>
                      {/* ACTION */}
                      <TableCell className="flex gap-2 items-center font-semibold cursor-pointer">
                        {getActionIcon(log.action)}
                        {capitalizeEveryWord(log.action)}
                      </TableCell>
                      {/* FIELD */}
                      <TableCell className="font-semibold">
                        {log?.field ? capitalizeEveryWord(log?.field) : "N/a"}
                      </TableCell>
                      {/* NEW VALUE */}
                      <TableCell className="font-semibold overflow-hidden text-ellipsis whitespace-nowrap max-w-[50px] cursor-pointer">
                        <ToolTip
                          content={`Updated${log?.field ? ` ${capitalizeEveryWord(log?.field)}` : ""}: ${newValue}`}
                          trigger={
                            <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                              {newValue}
                            </p>
                          }
                        />
                      </TableCell>
                      {/* PREVIOUS VALUE */}
                      <TableCell className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[50px] cursor-pointer">
                        <ToolTip
                          content={`Previous${log?.field ? ` ${capitalizeEveryWord(log?.field)}` : ""}: ${previousValue}`}
                          trigger={
                            <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                              {previousValue}
                            </p>
                          }
                        />
                      </TableCell>
                      {/* CHANGED BY */}
                      <TableCell
                        className="font-medium"
                        onClick={() => {
                          if (log?.changedById) {
                            router.push(`/dashboard/users/${log.changedById}`);
                          } else {
                            toast.error("User not found");
                          }
                        }}
                      >
                        <ToolTip
                          content={`Changed By: ${
                            log?.changedBy && log?.changedBy?.name
                              ? log?.changedBy?.name
                              : log?.changedById
                                ? log?.changedById.slice(0, 8)
                                : "N/a"
                          }`}
                          trigger={
                            <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                              {log?.changedBy && log?.changedBy?.name
                                ? log?.changedBy?.name
                                : log?.changedById
                                  ? log?.changedById.slice(0, 8)
                                  : "N/a"}
                            </p>
                          }
                        />
                      </TableCell>
                      {/* DATE CHANGED ON */}
                      <TableCell className="font-medium">
                        {log?.changedAt
                          ? new Date(log.changedAt).toLocaleDateString()
                          : "N/a"}
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

// <TableHead className="text-center">Snapshot</TableHead>
//  <TableCell className="font-medium">
//   {log?.snapshot ? (
//     <ToolTip
//       content={`View snapshot of ticket at time of change`}
//       trigger={
//         <p
//           className="underline decoration-dotted cursor-pointer text-center"
//           onClick={() => {
//             router.push(
//               `/dashboard/tickets/${log.ticketId}?snapshotId=${log.id}`
//             );
//           }}
//         >
//           View
//         </p>
//       }
//     />
//   ) : (
//     <p  className="text-muted-foreground">N/a</p>
//   )}
// </TableCell>
