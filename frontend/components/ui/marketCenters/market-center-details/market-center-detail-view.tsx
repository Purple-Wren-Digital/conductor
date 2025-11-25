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
  UsersResponse,
  MarketCenterNotificationCallback,
} from "@/lib/types";
import {
  ArrowLeft,
  Edit2,
  Hash,
  History,
  InfoIcon,
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
import { useFetchRatingsByMarketCenter } from "@/hooks/use-tickets";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { StarRating } from "@/components/ui/ratingInput/star-rating-static";

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
      name: "",
      selectedUsers: [],
    });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const invalidateMarketCenter = queryClient.invalidateQueries({
    queryKey: ["get-market-center", marketCenterId],
  });

  const { data: ratingsData, isLoading: marketCenterRatingsLoading } =
    useFetchRatingsByMarketCenter(
      ["market-center-details-ratings", marketCenterId],
      marketCenterId
    );

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
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/users`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!clerkUser,
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
      templateName,
      trigger,
      receivingUser,
      data,
    }: MarketCenterNotificationCallback) => {
      try {
        const response = await createAndSendNotification({
          getToken: getToken,
          templateName: templateName,
          trigger: trigger,
          receivingUser: receivingUser,
          data: data,
        });
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
            onClick={() => {
              setShowEditMCForm(true);
              setMarketCenterFormData({
                name: marketCenter?.name ?? "",
                selectedUsers: marketCenter?.users ?? [],
              });
            }}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Market Center
          </Button>
        </div>
      </div>
      {/* TOP */}
      {/* MARKET CENTER INFO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between  gap-2 md:text-xl">
            {marketCenter && marketCenter?.name && `${marketCenter.name} `}
            Market Center
            <ToolTip
              content="Ratings are based on resolved tickets within this market center via survey responses"
              trigger={<InfoIcon className="size-3.5 text-primary" />}
            />
          </CardTitle>
          <div className="flex flex-wrap gap-4 items-center text-sm text-muted-foreground font-medium">
            <span className="flex items-center gap-2 text-sm">
              Avg Market Center Rating:
              <StarRating
                rating={ratingsData?.marketCenterAverageRating ?? 0}
                size={16}
              />
            </span>
            <span className="flex items-center gap-1">
              Avg User Rating:
              <StarRating
                rating={ratingsData?.assigneeAverageRating ?? 0}
                size={16}
              />
            </span>
            <span className="flex items-center gap-2 text-sm">
              Avg Ticket Rating:
              <StarRating
                rating={ratingsData?.overallAverageRating ?? 0}
                size={16}
              />
            </span>
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
              marketCenterId={marketCenter.id}
              marketCenterName={marketCenter.name}
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
              // marketCenterId={marketCenter.id}
              isLoading={isSubmitting}
              setIsLoading={setIsSubmitting}
              invalidateMarketCenter={invalidateMarketCenter}
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
      />
    </div>
  );
}
