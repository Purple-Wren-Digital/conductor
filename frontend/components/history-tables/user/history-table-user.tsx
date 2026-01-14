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
import { useFetchUserHistory } from "@/hooks/use-history";
import { OrderBy, UserHistory } from "@/lib/types";
import { calculateTotalPages, capitalizeEveryWord } from "@/lib/utils";
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
import { toast } from "sonner";
// TODO export table to computer - excel/google sheets ??

export default function UserHistoryTable({ userId }: { userId?: string }) {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
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
    () => ["profile-user-history", userId, queryKeyParams] as const,
    [userId, queryKeyParams]
  );
  const { data: userHistoryData, isLoading } = useFetchUserHistory({
    id: userId,
    queryKey: userHistoryQueryKey,
    queryParams,
  });

  const userHistoryLogs: UserHistory[] = useMemo(
    () => userHistoryData?.userHistory ?? [],
    [userHistoryData]
  );
  const totalUserHistoryLogs: number = useMemo(
    () => userHistoryData?.total ?? 0,
    [userHistoryData]
  );
  const totalPages = calculateTotalPages({
    totalItems: totalUserHistoryLogs,
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
            <TableHead>Edited User</TableHead>
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
          {!isLoading && (!userHistoryLogs || !userHistoryLogs.length) && (
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
            userHistoryLogs &&
            userHistoryLogs.length > 0 &&
            userHistoryLogs.map((log: UserHistory, index: number) => {
              const action =
                log?.action !== "AUTOCLOSE" &&
                log?.newValue &&
                log?.newValue === "RESOLVED"
                  ? "CLOSE"
                  : log?.field === "comment"
                    ? "COMMENT"
                    : log?.action;

              const isViewingUser = userId === log?.userId;
              const isViewingChangedBy = userId === log?.changedById;
              return (
                <TableRow key={`${index}-${log?.id}`}>
                  {/* USER CHANGED */}
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => {
                      if (!isViewingUser && log?.userId) {
                        router.push(`/dashboard/users/${log.userId}`);
                      } else if (!isViewingUser && !log?.userId) {
                        toast.error("Error: User not found");
                      } else {
                        toast.info(
                          "You are already viewing this user's profile"
                        );
                      }
                    }}
                  >
                    <ToolTip
                      content={
                        isViewingUser
                          ? `You are already viewing ${
                              log?.user?.name ? log.user?.name : "this user"
                            }'s profile`
                          : isMobile
                            ? `Navigating to ${
                                log?.user?.name ? log.user?.name : "this user"
                              }'s profile`
                            : `View ${
                                log?.user?.name ? log.user?.name : "this user"
                              }'s profile`
                      }
                      trigger={
                        <p className="font-semibold underline decoration-dotted">
                          {log?.user && log?.user?.name
                            ? log.user.name
                            : log.userId.slice(0, 8)}
                        </p>
                      }
                      className="flex justify-start p-0"
                      classNameMobileButton="flex justify-start p-0"
                    />
                  </TableCell>
                  {/* ACTION */}
                  <TableCell>
                    <span className="flex gap-2 items-center font-semibold cursor-pointer capitalize">
                      {getActionIcon(action.split("_").join(" "))}
                      {action.split("_").join(" ").toLowerCase()}
                    </span>
                  </TableCell>
                  {/* FIELD */}
                  <TableCell className="font-semibold capitalize">
                    <p className="flex flex-col min-w-[80px]">
                      {log?.field
                        ? log.field.split("_").join(" ").toLowerCase()
                        : "Not found"}
                    </p>
                  </TableCell>
                  {/* NEW VALUE */}
                  <TableCell>
                    <span className="flex flex-col font-semibold min-w-[100px] max-w-[150px] cursor-pointer">
                      <ToolTip
                        content={`Updated${log?.field ? ` ${capitalizeEveryWord(log?.field.split("_").join(" "))}` : ""}: ${log?.newValue ? log?.newValue : "No new value"}`}
                        trigger={
                          <p className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                            {log?.newValue && log?.field === "role"
                              ? log.newValue.split("_").join(" ")
                              : log?.newValue
                                ? log.newValue
                                : "No new data"}
                          </p>
                        }
                        className="flex justify-start p-0"
                        classNameMobileButton="flex justify-start p-0"
                      />
                    </span>
                  </TableCell>
                  {/* PREVIOUS VALUE */}
                  <TableCell>
                    <span className="flex flex-col min-w-[100px] max-w-[150px] cursor-pointer text-muted-foreground">
                      <ToolTip
                        content={`Previous${log?.field ? ` ${capitalizeEveryWord(log?.field)}` : ""}: ${log?.previousValue ? log?.previousValue : "No previous value"}`}
                        trigger={
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {log?.previousValue && log?.field === "role"
                              ? log.previousValue.split("_").join(" ")
                              : log?.previousValue
                                ? log.previousValue
                                : "None"}
                          </p>
                        }
                        className="flex justify-start p-0"
                        classNameMobileButton="flex justify-start p-0"
                      />
                    </span>
                  </TableCell>
                  {/* CHANGED BY */}
                  <TableCell
                    className="font-medium"
                    onClick={() => {
                      if (log?.changedById === "SYSTEM") return;
                      if (!isViewingChangedBy && log?.changedById) {
                        router.push(`/dashboard/users/${log.changedById}`);
                      } else if (!isViewingChangedBy && !log?.changedById) {
                        toast.error("Error: User not found");
                      } else {
                        toast.info(
                          "You are already viewing this user's profile"
                        );
                      }
                    }}
                  >
                    <span className="flex flex-col min-w-[60px]">
                      {log?.changedById === "SYSTEM" ? (
                        "System"
                      ) : (
                        <ToolTip
                          content={`Changed By: ${
                            log?.changedBy && log?.changedBy?.name
                              ? log?.changedBy?.name
                              : log?.changedById
                                ? log?.changedById.slice(0, 8)
                                : "Not found"
                          }`}
                          trigger={
                            <p className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap">
                              {log?.changedBy && log?.changedBy?.name
                                ? log?.changedBy?.name
                                : log?.changedById
                                  ? log?.changedById.slice(0, 8)
                                  : "Not found"}
                            </p>
                          }
                          className="flex justify-start p-0"
                          classNameMobileButton="flex justify-start p-0"
                        />
                      )}
                    </span>
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
          totalItems={totalUserHistoryLogs}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
