"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { ROLE_COLORS, ROLE_DESCRIPTIONS, ROLE_ICONS } from "@/lib/utils";
import { UserPlus, User } from "lucide-react";
import TeamTable from "./team-table";
import TeamInvite from "./team-invite";

export default function TeamManagement() {
  const { permissions } = useUserRole();

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Manage your team members, roles, and invitations
              </CardDescription>
            </div>
            {permissions?.canManageTeam && <TeamInvite />}
          </div>
        </CardHeader>
      </Card>
      {/* ManagementTable  */}
      <TeamTable />

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understanding what each role can access and manage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
              <div key={role} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getRoleIcon(role)}
                  <Badge
                    variant={ROLE_COLORS[role as keyof typeof ROLE_COLORS]}
                  >
                    {role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
