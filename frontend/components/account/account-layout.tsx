"use client";

import { useUser } from "@clerk/nextjs";
import { useStore } from "@/context/store-provider";
import EditUserProfile from "@/components/account/edit-user-profile";
import NotificationPreferences from "@/components/account/notification-preferences";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs/base-tabs";
import UserTicketHistoryTable from "@/components/history-tables/user/history-table-user-tickets";
import UserHistoryTable from "@/components/history-tables/user/history-table-user";
import { useFetchOneUser } from "@/hooks/use-users";
import { ConductorUser } from "@/lib/types";
import { BellRing, History, UserCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useFetchRatingsByAssignee } from "@/hooks/use-tickets";

export default function AccountLayout() {
  const queryClient = useQueryClient();

  const router = useRouter();
  const { currentUser } = useStore();
  const { user: clerkUser } = useUser();

  const { data: userData, isLoading: userLoading } = useFetchOneUser({
    id: currentUser?.id,
  });
  const user: ConductorUser = userData?.user ?? {};

  const isCurrentUserProfile =
    currentUser?.email === user?.email && clerkUser?.id === user?.clerkId;

  const invalidateUserQuery = queryClient.invalidateQueries({
    queryKey: ["user-profile", user?.id],
  });
  const { data: userRatingsData } = useFetchRatingsByAssignee(
    ["ratings-by-assignee", user?.id],
    (userData?.resolvedTicketsCount ?? 0) > 0,
    user?.id
  );

  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "profile";

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <p className="hidden sm:inline">Account</p>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <p className="hidden sm:inline">User History</p>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            <p className="hidden sm:inline">Notifications</p>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <EditUserProfile
            user={user}
            isCurrentUserProfile={isCurrentUserProfile}
            invalidateUserQuery={invalidateUserQuery}
            userRatingsData={userRatingsData}
          />
        </TabsContent>

        <TabsContent value="history">
          <section className="lg:col-span-3 ">
            <div className="flex flex-row items-center justify-between">
              <p className="text-lg font-bold">Recent Activity</p>
            </div>
            <div className="space-y-10">
              <p className="text-md font-bold m-4 ml-2">Users</p>
              <UserHistoryTable userId={user?.id} />
              <p className="text-md font-bold m-4 ml-2">Tickets</p>
              <UserTicketHistoryTable
                userId={user?.id}
                username={user?.name ?? ""}
              />
            </div>
          </section>
        </TabsContent>
        <TabsContent value="settings">
          <NotificationPreferences
            userId={user?.id}
            invalidateUserQuery={invalidateUserQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
