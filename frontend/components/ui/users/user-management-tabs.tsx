"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs/base-tabs";
import { Mailbox, UserPlus, Users } from "lucide-react";
import UserManagement from "./user-management";
import { useRouter, useSearchParams } from "next/navigation";
import UserInvitationManagement from "./user-invitation-management";
import { useUserRole } from "@/hooks/use-user-role";

export default function UserManagementTabs() {
  const router = useRouter();
  const { permissions } = useUserRole();

  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "users";

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    router.replace(`?${params.toString()}`);
  };

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="users" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Users
        </TabsTrigger>
        {/* <TabsTrigger value="invitations" className="flex items-center gap-2">
          <Mailbox className="h-4 w-4" />
          User Invitations
        </TabsTrigger> */}
      </TabsList>

      <TabsContent value="users">
        {permissions?.canManageAllUsers && <UserManagement />}
      </TabsContent>

      {/* <TabsContent value="invitations">
        {permissions?.canManageAllUsers && <UserInvitationManagement />}
      </TabsContent> */}
    </Tabs>
  );
}
