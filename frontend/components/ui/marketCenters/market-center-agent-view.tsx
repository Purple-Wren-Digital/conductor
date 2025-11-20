"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui//separator";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { useFetchMarketCenter } from "@/hooks/use-market-center";
import type { MarketCenter, UserRole } from "@/lib/types";
import {
  arrayToCommaSeparatedListWithConjunction,
  getRoleDescription,
  ROLE_ICONS,
} from "@/lib/utils";
import { Building, Hash, Tags, Ticket, User, Users } from "lucide-react";
import Link from "next/link";

interface MarketCenterDetailProps {
  marketCenterId: string;
}

export default function MarketCenterAgentView({
  marketCenterId,
}: MarketCenterDetailProps) {
  const { data: marketCenterData, isLoading } = useFetchMarketCenter(
    "STAFF",
    marketCenterId
  );
  const marketCenter: MarketCenter = marketCenterData || {};

  const teamMembers = marketCenter?.users || [];
  const totalTeamMembers = marketCenter?.users?.length ?? 0;

  const categories = marketCenter?.ticketCategories || [];
  const totalCategories = marketCenter?.ticketCategories?.length ?? 0;

  const totalTickets = marketCenter?.totalTickets ?? 0;

  const getRoleIcon = (userRole: UserRole) => {
    const Icon = ROLE_ICONS[userRole as keyof typeof ROLE_ICONS];
    return Icon ? (
      <Icon
        className={`h-4 w-4 ${userRole === "AGENT" ? "text-black" : "text-white"}`}
      />
    ) : (
      <User className="h-4 w-4 text-black" />
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 md:text-xl">
                <Building className="h-5 w-5" />
                {marketCenter && marketCenter?.name
                  ? `${marketCenter.name} Market Center`
                  : ""}
                {!marketCenter && `Market Center Not Found`}
              </CardTitle>
              <CardDescription className="font-medium">
                View team members and market center details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground">ID:</p>
                <p className="font-medium">
                  {marketCenterId ? `${marketCenterId.slice(0, 8)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground">Users:</p>
                <p className="font-medium">{totalTeamMembers}</p>
              </div>
              <ToolTip
                content={arrayToCommaSeparatedListWithConjunction(
                  "and",
                  categories.map((cat) => cat.name)
                )}
                trigger={
                  <div className="flex items-center gap-2 text-sm">
                    <Tags className="h-4 w-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Categories:</p>
                    <p className="font-medium">{totalCategories}</p>
                  </div>
                }
              />
              <div className="flex items-center gap-2 text-sm">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground">Tickets:</p>
                <p className="font-medium">{totalTickets}</p>
              </div>
            </div>
          </div>
        </CardContent>
        <Separator className="bg-transparent" />
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Users assigned to this Market Center
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="space-y-4">
            {isLoading && (
              <p className="font-medium text-muted-foreground">
                Loading team members...
              </p>
            )}
            {!isLoading &&
              marketCenter &&
              (!teamMembers || !teamMembers.length) && (
                <p className="text-sm font-medium text-muted-foreground">
                  No users assigned to this Market Center yet
                </p>
              )}
            {!isLoading &&
              marketCenter &&
              teamMembers &&
              teamMembers.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {teamMembers.map((user) => {
                    return (
                      <div
                        key={user.id}
                        className="flex flex-col gap-2 p-4 border rounded-md"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <ToolTip
                            trigger={
                              <Badge
                                variant={
                                  (user?.role
                                    ? user.role.toLowerCase()
                                    : "user") as any
                                }
                                title={user?.role.split("_").join(" ")}
                                className="text-xs px-2 py-0.5"
                              >
                                {getRoleIcon(user?.role)}
                                {user?.role.split("_").join(" ")}
                              </Badge>
                            }
                            content={getRoleDescription(user?.role)}
                          />
                        </div>
                        <p className="font-medium">{user.name}</p>
                        <Link href={`mailto:${user.email}`}>
                          <p className="text-sm text-muted-foreground">
                            Email:{" "}
                            <span className="hover:underline">
                              {user.email}
                            </span>
                          </p>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
