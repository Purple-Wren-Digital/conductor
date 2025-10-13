"use client";

import { useStore } from "@/app/store-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MarketCenter, MarketCenterHistory } from "@/lib/types";
import { capitalizeEveryWord } from "@/lib/utils";
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

export default function MarketCenterHistory({
  marketCenter,
}: {
  marketCenter?: MarketCenter;
}) {
  const router = useRouter();
  const { currentUser } = useStore();

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

  const findChangedByName = (userId: string, name?: string) => {
    if (name) return name;
    if (!userId) return "No id";
    if (userId === currentUser?.id) return currentUser?.name;
    return userId.slice(0, 8);
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="border rounded">
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Updated Data</TableHead>
              <TableHead>Previous Data</TableHead>
              <TableHead>Changed By</TableHead>
              <TableHead>Changed On</TableHead>
              {/* <TableHead className="text-center">Snapshot</TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {marketCenter &&
              marketCenter?.marketCenterHistory &&
              marketCenter?.marketCenterHistory.length > 0 &&
              marketCenter?.marketCenterHistory.map(
                (entry: MarketCenterHistory, index: number) => {
                  const teamNewValue =
                    entry?.field === "team" && entry?.newValue;
                  const teamChangeNewValue =
                    entry?.newValue &&
                    teamNewValue &&
                    JSON.parse(entry.newValue);

                  const teamPrevValue =
                    entry?.field === "team" && entry?.previousValue;
                  const teamChangePrevValue =
                    entry?.previousValue &&
                    teamPrevValue &&
                    JSON.parse(entry.previousValue);
                  return (
                    <TableRow key={entry.id + index}>
                      {/* ACTION */}
                      <TableCell
                        className="cursor-pointer flex  gap-2 items-center"
                        onClick={() => {
                          router.push(`/dashboard/users/${entry?.changedById}`);
                        }}
                      >
                        {getActionIcon(entry?.action)}
                        <p className="font-semibold hover:underline pointer-events-auto">
                          {capitalizeEveryWord(entry?.action)}
                        </p>
                      </TableCell>
                      {/* FIELD */}
                      <TableCell>
                        <p className="font-semibold">
                          {entry?.field && capitalizeEveryWord(entry?.field)}
                        </p>
                      </TableCell>
                      {/* NEW VALUE */}
                      <TableCell>
                        <p className="font-medium">
                          {entry?.field === "team" &&
                            entry?.newValue &&
                            teamChangeNewValue?.name}

                          {entry?.field !== "team" &&
                            entry?.newValue &&
                            capitalizeEveryWord(
                              entry?.newValue.replace("_", " ")
                            )}
                        </p>
                      </TableCell>
                      {/* OLD VALUE */}
                      <TableCell>
                        <p>
                          {entry?.field === "team" &&
                            entry?.previousValue &&
                            teamChangePrevValue?.name}

                          {entry?.field !== "team" &&
                            entry?.previousValue &&
                            capitalizeEveryWord(
                              entry?.previousValue.replace("_", " ")
                            )}
                          {/* {entry?.previousValue &&
                                  capitalizeEveryWord(
                                    entry?.previousValue.replace("_", " ")
                                  )} */}
                        </p>
                      </TableCell>
                      {/* CHANGED BY */}
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => {
                          router.push(`/dashboard/users/${entry?.changedById}`);
                        }}
                      >
                        <p className="font-medium">
                          {entry?.changedBy?.name ??
                            findChangedByName(entry?.changedById)}
                        </p>
                        <p className="font-medium"></p>
                      </TableCell>
                      {/* CHANGED ON */}
                      <TableCell>
                        <p>
                          {entry?.changedAt
                            ? new Date(entry?.changedAt).toLocaleDateString()
                            : "-"}
                        </p>
                      </TableCell>
                      {/* SNAPSHOT OR GO TO TICKET */}
                      {/* <TableCell className="items-center justify-center">
                              <Link href={`/dashboard/tickets/${entry?.id}`}>
                                <div className="flex gap-2 items-center justify-center">
                                  <Eye className="h-4 w-4" />
                                  <p>View</p>
                                </div>
                              </Link>
                            </TableCell> */}
                    </TableRow>
                  );
                }
              )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
