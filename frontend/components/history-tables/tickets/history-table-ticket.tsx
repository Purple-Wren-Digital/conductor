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
import { SafeHtml } from "@/components/ui/safe-html";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { useFetchTicketHistory } from "@/hooks/use-history";
import { processCommentContent } from "@/lib/sanitize";
import { OrderBy, TicketHistory } from "@/lib/types";
import { calculateTotalPages } from "@/lib/utils";
import {
  ArrowRightLeft,
  CircleMinus,
  CirclePlus,
  Clipboard,
  Mailbox,
  MessageSquare,
  SquarePen,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// TODO export table to computer - excel/google sheets ??

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
    [ticketId, queryKeyParams]
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
      case "REOPENED":
        return <Undo2 className="h-3 w-3" />;
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
              const field =
                log?.field && log?.field === "dueDate"
                  ? "due date"
                  : log?.field
                    ? log.field
                    : "N/a";

              const newValueFormatted =
                log?.field === "dueDate" && log?.newValue
                  ? new Date(log.newValue).toLocaleDateString()
                  : log?.field === "status" && log?.newValue
                    ? log.newValue.split("_").join(" ")
                    : log?.newValue;

              const previousValueFormatted =
                log?.field === "dueDate" && log?.previousValue
                  ? new Date(log.previousValue).toLocaleDateString()
                  : log?.field === "status" && log?.previousValue
                    ? log.previousValue.split("_").join(" ")
                    : log?.previousValue;

              return (
                <TableRow key={`${index}-${log?.id}`}>
                  {/* ACTION */}
                  <TableCell>
                    <p className="flex gap-2 items-center font-semibold cursor-pointer capitalize">
                      {log?.field === "comment" ? (
                        <MessageSquare className="h-3 w-3" />
                      ) : (
                        getActionIcon(log?.action)
                      )}
                      {log.action.toLowerCase()}
                    </p>
                  </TableCell>
                  {/* FIELD */}
                  <TableCell className="font-semibold capitalize">
                    {field}
                  </TableCell>
                  {/* NEW VALUE */}
                  <TableCell className="font-semibold overflow-hidden text-ellipsis whitespace-nowrap max-w-[50px] cursor-pointer">
                    {log?.field === "comment" ? (
                      <SafeHtml
                        content={newValueFormatted ? newValueFormatted : "-"}
                      />
                    ) : (
                      <ToolTip
                        content={`Updated ${field}: ${newValueFormatted ? newValueFormatted : "N/a"}`}
                        trigger={
                          <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap">
                            {newValueFormatted ? newValueFormatted : "N/a"}
                          </p>
                        }
                      />
                    )}
                  </TableCell>
                  {/* PREVIOUS VALUE */}
                  <TableCell className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[50px] cursor-pointer">
                    {log?.field === "comment" ? (
                      <SafeHtml
                        content={
                          previousValueFormatted ? previousValueFormatted : "-"
                        }
                      />
                    ) : (
                      <ToolTip
                        content={`Previous ${field}: ${previousValueFormatted ? processCommentContent(previousValueFormatted) : "N/a"}`}
                        trigger={
                          <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                            {previousValueFormatted
                              ? processCommentContent(previousValueFormatted)
                              : "N/a"}
                          </p>
                        }
                      />
                    )}
                  </TableCell>
                  {/* CHANGED BY */}
                  <TableCell
                    className="font-medium"
                    onClick={() => {
                      if (log?.changedById) {
                        router.push(`/dashboard/users/${log.changedById}`);
                      } else {
                        toast.error("Error: User not found");
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
