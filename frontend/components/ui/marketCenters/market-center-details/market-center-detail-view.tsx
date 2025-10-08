"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/app/store-provider";
import { getAccessToken } from "@auth0/nextjs-auth0";
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
import { API_BASE } from "@/lib/api/utils";
import { useUserRole } from "@/lib/hooks/use-user-role";
import type { PrismaUser, MarketCenterForm, TicketCategory } from "@/lib/types";
import {
  ArrowLeft,
  Building,
  Edit2,
  Hash,
  History,
  Tags,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
// import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import MarketCenterHistory from "./market-center-history";
import MarketCenterTicketCategories from "./market-center-ticket-categories";
import MarketCenterUsers from "./market-center-users";

interface MarketCenterDetailProps {
  marketCenterId: string;
}

export default function MarketCenterDetailView({
  marketCenterId,
}: MarketCenterDetailProps) {
  const router = useRouter();

  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "general";

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    router.replace(`?${params.toString()}`);
  };

  const queryClient = useQueryClient();

  const { role, permissions } = useUserRole();

  const { data: marketCenter, isLoading } = useFetchMarketCenter(
    role,
    marketCenterId
  );

  const totalTeamMembers = marketCenter?.users ? marketCenter?.users.length : 0;
  const totalCategories = marketCenter?.ticketCategories
    ? marketCenter?.ticketCategories.length
    : 0;

  const [showEditMCForm, setShowEditMCForm] = useState(false);
  const [marketCenterFormData, setMarketCenterFormData] =
    useState<MarketCenterForm>({
      name: marketCenter?.name ?? ("" as string),
      selectedUsers: marketCenter?.users as PrismaUser[],
      ticketCategories: marketCenter?.ticketCategories as TicketCategory[],
    });
  const [unassignedUsers, setUnassignedUsers] = useState<PrismaUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false); //(isLoading);

  const invalidateMarketCenter = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["get-market-center", marketCenterId],
    });
  }, [queryClient]);

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const fetchActiveUsers = useCallback(async () => {
    // setIsLoading(true);
    const params = !permissions?.canCreateUsers ? `?role=AGENT` : "";

    try {
      const accessToken = await getAuth0AccessToken();
      if (!accessToken) {
        throw new Error("No token fetched");
      }
      const response = await fetch(`${API_BASE}/users${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch users");
      const data: { users: PrismaUser[] } = await response.json();

      const needsAssignment: PrismaUser[] = data.users.filter((user) => {
        if (!user?.marketCenterId) return user;
      });
      setUnassignedUsers(needsAssignment || []);
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      // setIsLoading(false);
    }
  }, [getAuth0AccessToken]);

  useEffect(() => {
    if (!showEditMCForm) return;
    fetchActiveUsers();
  }, [showEditMCForm]);

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
              <CardTitle className="flex items-center gap-2 text-xl">
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
            <div className="grid gap-4 md:grid-cols-3">
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
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Ticket Categories
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Activity
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
            />
          )}
        </TabsContent>

        <TabsContent value="activity">
          {marketCenter && <MarketCenterHistory marketCenter={marketCenter} />}
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
        refreshUsers={fetchActiveUsers}
      />
    </div>
  );
}
