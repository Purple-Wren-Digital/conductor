"use client";

import { useCallback, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import EditMarketCenter from "@/components/ui/marketCenters/market-center-edit-form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs/base-tabs";
import { useFetchMarketCenter } from "@/hooks/use-market-center";
import { useUserRole } from "@/hooks/use-user-role";
import { API_BASE } from "@/lib/api/utils";
import type {
  PrismaUser,
  MarketCenterForm,
  TicketCategory,
  UsersResponse,
  MarketCenterNotificationCallback,
} from "@/lib/types";
import {
  ArrowLeft,
  Building,
  Edit2,
  Hash,
  History,
  Tags,
  Ticket,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import MarketCenterHistory from "./market-center-history";
import MarketCenterTicketCategories from "./market-center-ticket-categories";
import MarketCenterUsers from "./market-center-users";
import { createAndSendNotification } from "@/lib/utils/notifications";

interface MarketCenterDetailProps {
  marketCenterId: string;
}

export default function MarketCenterDetailView({
  marketCenterId,
}: MarketCenterDetailProps) {
  const router = useRouter();
  const { user: clerkUser } = useUser();

  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "team";

  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const { role } = useUserRole();

  const { data: marketCenter } = useFetchMarketCenter(role, marketCenterId);

  const totalTeamMembers = marketCenter?.users ? marketCenter?.users.length : 0;
  const totalCategories = marketCenter?.ticketCategories
    ? marketCenter?.ticketCategories.length
    : 0;
  const totalTickets = marketCenter?.totalTickets ?? 0;

  const [showEditMCForm, setShowEditMCForm] = useState(false);
  const [marketCenterFormData, setMarketCenterFormData] =
    useState<MarketCenterForm>({
      name: marketCenter?.name ?? ("" as string),
      selectedUsers: marketCenter?.users as PrismaUser[],
      ticketCategories: marketCenter?.ticketCategories as TicketCategory[],
    });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const invalidateMarketCenter = queryClient.invalidateQueries({
    queryKey: ["get-market-center", marketCenterId],
  });

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    router.replace(`?${params.toString()}`);
  };

  const { data: usersData }: UseQueryResult<UsersResponse, Error> = useQuery<
    UsersResponse,
    Error,
    UsersResponse
  >({
    queryKey: ["market-center-detail-users"],
    queryFn: async (): Promise<UsersResponse> => {
      if (!clerkUser?.id) {
        throw new Error("Missing auth token");
      }
      const res = await fetch(`${API_BASE}/users`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkUser.id}`,
        },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!clerkUser && !!clerkUser?.id,
  });

  const users: PrismaUser[] = usersData?.users ?? [];
  const unassignedUsers: PrismaUser[] = users.filter((user) => {
    if (!user?.marketCenterId) return user;
  });

  const invalidateUsers = queryClient.invalidateQueries({
    queryKey: ["market-center-detail-users"],
  });

  const handleSendMarketCenterNotifications = useCallback(
    async ({
      trigger,
      receivingUser,
      data,
    }: MarketCenterNotificationCallback) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        const response = await createAndSendNotification({
          authToken: token,
          trigger: trigger,
          receivingUser: receivingUser,
          data: data,
        });
        console.log("MarketCenterDetail - Notification - Response", response);
      } catch (error) {
        console.error(
          "MarketCenterDetailPage - Unable to generate notifications",
          error
        );
      }
    },
    [getToken]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowEditMCForm(true)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Market center
          </Button>
        </div>
      </div>
      {/* TOP */}
      {/* MARKET CENTER INFO */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 md:text-xl">
                <Building className="h-5 w-5" />
                {marketCenter && marketCenter?.name && `${marketCenter.name} `}
                Market Center
              </CardTitle>
              <CardDescription className="font-medium">
                Manage settings and team
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
                  {marketCenter?.id
                    ? `${marketCenter?.id.slice(0, 8)}`
                    : "Not found"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground">Users:</p>
                <p className="font-medium">{totalTeamMembers}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Tags className="h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground">Categories:</p>
                <p className="font-medium">{totalCategories}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground">Tickets:</p>
                <p className="font-medium">{totalTickets}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <p className="hidden sm:inline">Team</p>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            <p className="hidden sm:inline">Ticket Categories</p>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <p className="hidden sm:inline">Activity</p>
          </TabsTrigger>

          {/* <TabsTrigger
            value="import-export"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Import/Export
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="team">
          {marketCenter && (
            <MarketCenterUsers
              marketCenter={marketCenter}
              isLoading={isSubmitting}
              setIsLoading={setIsSubmitting}
              invalidateMarketCenter={invalidateMarketCenter}
              handleSendMarketCenterNotifications={
                handleSendMarketCenterNotifications
              }
            />
          )}
        </TabsContent>

        <TabsContent value="categories">
          {marketCenter && (
            <MarketCenterTicketCategories
              marketCenter={marketCenter}
              isLoading={isSubmitting}
              setIsLoading={setIsSubmitting}
              invalidateMarketCenter={invalidateMarketCenter}
              handleSendMarketCenterNotifications={
                handleSendMarketCenterNotifications
              }
            />
          )}
        </TabsContent>

        <TabsContent value="activity">
          <MarketCenterHistory marketCenterId={marketCenterId} />
        </TabsContent>

        {/* <TabsContent value="import-export">
          <ImportExport />
        </TabsContent> */}
      </Tabs>

      {/* EDIT MARKET CENTER */}
      <EditMarketCenter
        editingMarketCenter={marketCenter}
        showEditMCForm={showEditMCForm}
        setShowEditMCForm={setShowEditMCForm}
        assignedUsers={marketCenter?.users ?? []}
        unassignedUsers={unassignedUsers}
        formData={marketCenterFormData}
        setFormData={setMarketCenterFormData}
        refreshMarketCenters={invalidateMarketCenter}
        refreshUsers={invalidateUsers}
        handleSendMarketCenterNotifications={
          handleSendMarketCenterNotifications
        }
      />
    </div>
  );
}
