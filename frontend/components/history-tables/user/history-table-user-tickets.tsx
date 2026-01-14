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
import { useIsMobile } from "@/hooks/use-mobile";
import { useFetchUserTicketHistory } from "@/hooks/use-history";
import { OrderBy, TicketHistory } from "@/lib/types";
import { calculateTotalPages } from "@/lib/utils";
import {
  ArrowRightLeft,
  CircleMinus,
  CirclePlus,
  Clipboard,
  Loader,
  LockIcon,
  Mailbox,
  MessageSquare,
  SquareCheckBig,
  SquarePen,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SafeHtml } from "@/components/ui/safe-html";
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

  const isMobile = useIsMobile();

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
    <div className="grid auto-cols-[minmax(0,2fr)] place-content-evenly p-1 rounded-lg border">
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
              <TableCell className={`${isMobile ? "" : "col-span-full"}`}>
                <span className={` ${isMobile ? "min-w-[100px]" : ""}`}>
                  <Loader className="text-muted-foreground inline-block mr-2 animate-spin" />
                </span>
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            (!userTicketHistoryLogs || !userTicketHistoryLogs.length) && (
              <TableRow>
                <TableCell className={`${isMobile ? "" : "col-span-full"}`}>
                  <p
                    className={`text-muted-foreground ${isMobile ? "min-w-[100px]" : ""}`}
                  >
                    No logs found
                  </p>
                </TableCell>
              </TableRow>
            )}

          {!isLoading &&
            userTicketHistoryLogs &&
            userTicketHistoryLogs.length > 0 &&
            userTicketHistoryLogs.map((log: TicketHistory, index: number) => {
              const action =
                log?.action !== "AUTOCLOSE" &&
                log?.newValue &&
                log?.newValue === "RESOLVED"
                  ? "CLOSE"
                  : log?.field === "comment"
                    ? "COMMENT"
                    : log?.action;

              const field =
                log?.field && log?.field === "dueDate"
                  ? "due date"
                  : log?.field
                    ? log.field.split("_").join(" ")
                    : "Not found";

              const newValueFormatted =
                field === "dueDate" && log?.newValue
                  ? new Date(log.newValue).toLocaleDateString()
                  : field === "status" && log?.newValue
                    ? log.newValue.split("_").join(" ")
                    : log?.newValue;

              const previousValueFormatted =
                field === "dueDate" && log?.previousValue
                  ? new Date(log.previousValue).toLocaleDateString()
                  : field === "status" && log?.previousValue
                    ? log.previousValue.split("_").join(" ")
                    : log?.previousValue;
              return (
                <TableRow key={`${index}-${log?.id}`}>
                  {/* TICKET */}
                  <TableCell
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/tickets/${log.ticketId}`)
                    }
                  >
                    <ToolTip
                      content={`View Ticket: ${
                        log.ticket?.title
                          ? log.ticket?.title
                          : log.ticketId.slice(0, 8)
                      }`}
                      trigger={
                        <p className="font-semibold underline decoration-dotted w-[90px]">
                          {log.ticket?.title
                            ? log.ticket?.title
                            : log.ticketId.slice(0, 8)}
                        </p>
                      }
                      className="flex justify-start p-0"
                      classNameMobileButton="flex justify-start p-0"
                    />
                  </TableCell>
                  {/* ACTION */}
                  <TableCell>
                    <p className="flex gap-2 items-center font-semibold cursor-pointer capitalize">
                      {getActionIcon(action.split("_").join(" "))}
                      {action.split("_").join(" ").toLowerCase()}
                    </p>
                  </TableCell>
                  {/* FIELD */}
                  <TableCell className="font-semibold capitalize">
                    <p className="flex flex-col min-w-[80px]">
                      {field.toLowerCase()}
                    </p>
                  </TableCell>
                  {/* NEW VALUE */}
                  <TableCell>
                    <span className="flex flex-col font-semibold min-w-[100px] max-w-[150px] cursor-pointer">
                      {field === "comment" || field === "description" ? (
                        <SafeHtml
                          content={newValueFormatted ? newValueFormatted : "-"}
                          className={`
                          font-medium leading-relaxed text-muted-foreground
                          line-spacing-10 wrap-break-word whitespace-normal rich-text
                          [&_a]:underline [&_a:hover]:text-muted-foreground
                          [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                          [&_li]:list-item [&_li]:mb-1`}
                        />
                      ) : (
                        <ToolTip
                          content={`Updated ${field}: ${newValueFormatted ? newValueFormatted : "-"}`}
                          trigger={
                            <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                              {newValueFormatted
                                ? newValueFormatted
                                : "No new data"}
                            </p>
                          }
                          className="flex justify-start p-0"
                          classNameMobileButton="flex justify-start p-0"
                        />
                      )}
                    </span>
                  </TableCell>
                  {/* PREVIOUS VALUE */}
                  <TableCell>
                    <span className="flex flex-col font-semibold min-w-[100px] max-w-[150px] cursor-pointer text-muted-foreground ">
                      {log?.field === "comment" ||
                      log?.field === "description" ? (
                        <SafeHtml
                          content={
                            previousValueFormatted
                              ? previousValueFormatted
                              : "-"
                          }
                          className={`
                          font-medium leading-relaxed text-muted-foreground
                          line-spacing-10 wrap-break-word whitespace-normal rich-text
                          [&_a]:underline [&_a:hover]:text-muted-foreground
                          [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                          [&_li]:list-item [&_li]:mb-1`}
                        />
                      ) : (
                        <ToolTip
                          content={`Previous ${field} data: ${previousValueFormatted ? previousValueFormatted : "No previous data"}`}
                          trigger={
                            <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap ">
                              {previousValueFormatted
                                ? previousValueFormatted
                                : "None"}
                            </p>
                          }
                          className="flex justify-start p-0"
                          classNameMobileButton="flex justify-start p-0"
                        />
                      )}
                    </span>
                  </TableCell>
                  {/* CHANGED BY */}
                  <TableCell className="font-medium">
                    <p className="flex flex-col min-w-[60px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {index === 0 ? username : ""}
                    </p>
                  </TableCell>
                  {/* DATE CHANGED ON */}
                  <TableCell className="font-medium">
                    <p className="flex flex-col min-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {log?.changedAt
                        ? new Date(log.changedAt).toLocaleDateString()
                        : "Not found"}
                    </p>
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
