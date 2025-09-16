"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs/base-tabs";
import { Mailbox, ShieldBan, ShieldCheck, UserPlus, Users } from "lucide-react";
import UserManagement from "./user-management";
import { useRouter, useSearchParams } from "next/navigation";
import UserInvitationManagement from "./user-invitation-management";
import { Card, CardHeader, CardTitle } from "../card";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { Button } from "../button";

export default function UserManagementTabs() {
  const router = useRouter();
  const { permissions } = useUserRole();

  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "active";

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    router.replace(`?${params.toString()}`);
  };

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="active" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Active Users
        </TabsTrigger>
        <TabsTrigger value="invitations" className="flex items-center gap-2">
          <Mailbox className="h-4 w-4" />
          Invitations
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active">
        {permissions?.canManageAllUsers ? (
          <UserManagement />
        ) : (
          <Card className="space-y-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management (0)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage users, roles, and permissions
                  </p>
                </div>
                <Button className="gap-2" disabled={true}>
                  <UserPlus className="h-4 w-4" />
                  Create New User
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <p className="text-lg font-bold text-destructive">
                  You do not have permission to access this page.
                </p>
              </div>
            </CardHeader>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="invitations">
        {permissions?.canManageAllUsers ? (
          <UserInvitationManagement />
        ) : (
          <Card className="space-y-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Invitation Management (0)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create and invite new users to join Conductor Ticketing
                  </p>
                </div>
                <Button className="gap-2" disabled={true}>
                  <UserPlus className="h-4 w-4" />
                  Create New User
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <p className="text-lg font-bold text-destructive">
                  You do not have permission to access this page.
                </p>
              </div>
            </CardHeader>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
