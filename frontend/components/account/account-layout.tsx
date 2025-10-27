"use client";

import { useCallback } from "react";
import { getAccessToken } from "@auth0/nextjs-auth0";
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
import { PrismaUser } from "@/lib/types";
import { BellRing, History, UserCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export default function AccountLayout() {
  const queryClient = useQueryClient();

  const router = useRouter();
  const { currentUser } = useStore();

  const { data: userData, isLoading: userLoading } = useFetchOneUser(
    currentUser?.id
  );
  const user: PrismaUser = userData ?? {};

  const isCurrentUserProfile =
    currentUser?.id === user?.id && currentUser?.auth0Id === user?.auth0Id;

  const invalidateUserQuery = queryClient.invalidateQueries({
    queryKey: ["user-profile", user?.id],
  });

  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "profile";

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    router.replace(`?${params.toString()}`);
  };

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const fetchManagementToken = useCallback(async () => {
    if (!isCurrentUserProfile) {
      throw new Error("Not authorized to update this profile");
    }
    try {
      const accessToken = await getAuth0AccessToken();
      if (!accessToken) throw new Error("No access token available");
      const response = await fetch("/api/admin/managementToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      if (!response.ok) {
        throw new Error(response.statusText || "Failed to fetch token");
      }
      const data = await response.json();
      return data.managementToken;
    } catch (error) {
      console.error("Failed to fetch management token: ", error);
      return null;
    }
  }, []);
  // console.log("USER PROFILE", user);
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
            fetchManagementToken={fetchManagementToken}
            getAuth0AccessToken={getAuth0AccessToken}
            invalidateUserQuery={invalidateUserQuery}
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
            user={user}
            getAuth0AccessToken={getAuth0AccessToken}
            invalidateUserQuery={invalidateUserQuery}
          />
        </TabsContent>

        {/* <TabsContent value="passwordReset">
          <PasswordReset
            isCurrentUserProfile={isCurrentUserProfile}
            fetchManagementToken={fetchManagementToken}
          />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
//<TabsTrigger
//             value="import-export"
//             className="flex items-center gap-2"
//           >
//             <Download className="h-4 w-4" />
//             Import/Export
//           </TabsTrigger>  <TabsTrigger value="audit" className="flex items-center gap-2">
//             <History className="h-4 w-4" />
//             Audit Log
//           </TabsTrigger> <TabsTrigger value="sign-out" className="flex items-center gap-2">
//             <LogOut className="h-4 w-4" />
//             Sign out
//           </TabsTrigger>
//  <TabsContent value="categories">
//           <TicketCategories />
//         </TabsContent>
// <TabsContent value="import-export">
//           <ImportExport />
//         </TabsContent>
// <TabsContent value="audit">
//           <AuditLog />
//         </TabsContent>
//  <TabsContent value="account">
//           <Card>
//             <CardHeader>
//               <CardTitle>Sign out</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <Button asChild>
//                 <Link href="/auth/logout" onClick={() => setCurrentUser(null)}>
//                   Sign out <LogOut className="ml-2 h-4 w-4" />
//                 </Link>
//               </Button>
//             </CardContent>
//           </Card>
//         </TabsContent>
