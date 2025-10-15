"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PagesAndItemsCount from "@/components/ui/pagination/page-and-items-count";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { useFetchTicketHistory } from "@/hooks/use-history";
import { OrderBy, TicketHistory } from "@/lib/types";
import { calculateTotalPages, capitalizeEveryWord } from "@/lib/utils";
import {
  ArrowRightLeft,
  CircleMinus,
  CirclePlus,
  Clipboard,
  Mailbox,
  MessageSquare,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// TODO: export table to computer - excel/google sheets ??

export default function TicketHistoryTable({
  ticketId,
}: {
  ticketId?: string;
}) {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
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
  const ticketHistoryQueryKey = useMemo(
    () => ["ticket-history", ticketId, queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: ticketHistoryData, isLoading } = useFetchTicketHistory({
    id: ticketId,
    queryKey: ticketHistoryQueryKey,
    queryParams: queryParams,
  });

  const ticketHistoryLogs: TicketHistory[] =
    ticketHistoryData?.ticketHistory ?? [];
  const totalTicketHistoryLogs: number = ticketHistoryData?.total ?? 0;
  const totalPages = calculateTotalPages({
    totalItems: totalTicketHistoryLogs,
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
    <div className="max-w-[300px] xs:max-w-full rounded-lg border p-1 ">
      <Table className="overflow-scroll">
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Updated Data</TableHead>
            <TableHead>Previous Data</TableHead>
            <TableHead>Changed By</TableHead>
            <TableHead>Changed On</TableHead>
            {/* <TableHead className="text-center">Snapshot</TableHead> */}
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
          {!isLoading && (!ticketHistoryLogs || !ticketHistoryLogs.length) && (
            <TableRow>
              <TableCell className="text-muted-foreground col-span-full">
                No logs found
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            ticketHistoryLogs &&
            ticketHistoryLogs.length > 0 &&
            ticketHistoryLogs.map((log: TicketHistory, index: number) => {
              return (
                <TableRow key={`${index}-${log?.id}`}>
                  {/* ACTION */}
                  <TableCell className="flex gap-2 items-center font-semibold cursor-pointer">
                    {log?.field === "comment" ? (
                      <MessageSquare className="h-3 w-3" />
                    ) : (
                      getActionIcon(log?.action)
                    )}
                    {capitalizeEveryWord(log.action)}
                  </TableCell>
                  {/* FIELD */}
                  <TableCell className="font-semibold">
                    {log?.field ? capitalizeEveryWord(log?.field) : "N/a"}
                  </TableCell>
                  {/* NEW VALUE */}
                  <TableCell className="font-semibold overflow-hidden text-ellipsis whitespace-nowrap max-w-[50px] cursor-pointer">
                    <ToolTip
                      content={`Updated${log?.field ? ` ${capitalizeEveryWord(log?.field)}` : ""}: ${log?.newValue ? log?.newValue : "N/a"}`}
                      trigger={
                        <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                          {log?.newValue ? log?.newValue : "N/a"}
                        </p>
                      }
                    />
                  </TableCell>
                  {/* PREVIOUS VALUE */}
                  <TableCell className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[50px] cursor-pointer">
                    <ToolTip
                      content={`Previous${log?.field ? ` ${capitalizeEveryWord(log?.field)}` : ""}: ${log?.previousValue ? log?.previousValue : "N/a"}`}
                      trigger={
                        <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                          {log?.previousValue ? log?.previousValue : "N/a"}
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
                        toast.error("User ID not found");
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
                  {/* <TableCell className="font-medium">
                    {log?.snapshot ? (
                      <ToolTip
                        content={`View snapshot of ticket at time of change`}
                        trigger={
                          <p 
                            className="underline decoration-dotted cursor-pointer text-center"
                            onClick={() => {
                              router.push(
                                `/dashboard/tickets/${log.ticketId}?snapshotId=${log.id}`
                              );
                            }}
                          >
                            View
                          </p>
                        }
                      />
                    ) : (
                      <p  className="text-muted-foreground">N/a</p>
                    )}
                  </TableCell> */}
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
      <div className="p-2">
        <PagesAndItemsCount
          type="logs"
          totalItems={totalTicketHistoryLogs}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
