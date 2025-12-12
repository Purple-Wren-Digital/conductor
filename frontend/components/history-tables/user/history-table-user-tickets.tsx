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
import { useFetchUserTicketHistory } from "@/hooks/use-history";
import { OrderBy, TicketHistory } from "@/lib/types";
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
// TODO: export table to computer - excel/google sheets ??

export default function UserTicketHistoryTable({
  userId,
  username,
}: {
  userId?: string;
  username: string;
}) {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); //(10);
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
  const userHistoryQueryKey = useMemo(
    () => ["profile-user-history-tickets", userId, queryKeyParams] as const,
    [queryKeyParams, userId]
  );

  const { data: userTicketHistoryData, isLoading } = useFetchUserTicketHistory({
    id: userId,
    queryKey: userHistoryQueryKey,
    queryParams,
  });

  const userTicketHistoryLogs: TicketHistory[] =
    userTicketHistoryData?.ticketHistory ?? [];
  const totalUserTicketHistoryLogs: number = userTicketHistoryData?.total ?? 0;
  const totalPages = calculateTotalPages({
    totalItems: totalUserTicketHistoryLogs,
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
    <div className="max-w-[300px] xs:max-w-full overflow-x-auto rounded-lg border p-1 ">
      <Table className="overflow-scroll">
        <TableHeader>
          <TableRow>
            <TableHead>Edited Ticket</TableHead>
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
          {!isLoading &&
            (!userTicketHistoryLogs || !userTicketHistoryLogs.length) && (
              <TableRow>
                <TableCell className="text-muted-foreground col-span-full">
                  No logs found
                </TableCell>
              </TableRow>
            )}

          {!isLoading &&
            userTicketHistoryLogs &&
            userTicketHistoryLogs.length > 0 &&
            userTicketHistoryLogs.map((log: TicketHistory, index: number) => {
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
                  {/* TICKET */}
                  <TableCell
                    className="font-semibold truncate overflow-hidden text-ellipsis whitespace-nowrap max-w-[80px] cursor-pointer"
                    onClick={() => {
                      router.push(`/dashboard/tickets/${log.ticketId}`);
                    }}
                  >
                    <ToolTip
                      content={`View Ticket: ${
                        log.ticket?.title
                          ? log.ticket?.title
                          : log.ticketId.slice(0, 8)
                      }`}
                      trigger={
                        <p className="underline decoration-dotted cursor-pointer">
                          {log.ticket?.title
                            ? log.ticket?.title
                            : log.ticketId.slice(0, 8)}
                        </p>
                      }
                    />
                  </TableCell>
                  {/* ACTION */}
                  <TableCell className="flex gap-2 items-center font-semibold cursor-pointer capitalize">
                    {getActionIcon(log.action)}
                    {log.action.toLowerCase()}
                  </TableCell>
                  {/* FIELD */}
                  <TableCell className="font-semibold capitalize">
                    {field}
                  </TableCell>
                  {/* NEW VALUE */}
                  <TableCell className="font-semibold overflow-hidden text-ellipsis whitespace-nowrap max-w-[50px] cursor-pointer">
                    <ToolTip
                      content={`Updated ${field}: ${newValueFormatted ? newValueFormatted : "N/a"}`}
                      trigger={
                        <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                          {newValueFormatted ? newValueFormatted : "N/a"}
                        </p>
                      }
                    />
                  </TableCell>
                  {/* PREVIOUS VALUE */}
                  <TableCell className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[50px] cursor-pointer">
                    <ToolTip
                      content={`Previous ${field}: ${previousValueFormatted ? previousValueFormatted : "N/a"}`}
                      trigger={
                        <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                          {previousValueFormatted
                            ? previousValueFormatted
                            : "N/a"}
                        </p>
                      }
                    />
                  </TableCell>
                  {/* CHANGED BY */}
                  <TableCell className="font-medium">
                    {index === 0 ? <p>{username}</p> : <p></p>}
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
          totalItems={totalUserTicketHistoryLogs}
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
