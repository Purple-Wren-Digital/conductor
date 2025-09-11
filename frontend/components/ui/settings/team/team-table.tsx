"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { useListTeamMembers } from "@/hooks/use-settings";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { ROLE_COLORS, ROLE_ICONS } from "@/lib/utils";
import TeamUserActions from "@/components/ui/settings/team/team-user-actions";
import { useRouter } from "next/navigation";

export type EditMemberProp = {
  id: string;
};

export default function TeamTable() {
  const { data: teamData, isLoading } = useListTeamMembers();

  const { permissions } = useUserRole();

  const [editingMember, setEditingMember] = useState<EditMemberProp | null>(
    null
  );

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Team Members</CardTitle>
        <CardDescription>
          {teamData?.total || 0} active team members
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-10">
        {!isLoading && teamData?.members && teamData.members.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name & Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamData.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={ROLE_COLORS[member.role]}
                      className="flex items-center gap-1 w-fit"
                    >
                      {getRoleIcon(member.role)}
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.isActive ? "default" : "secondary"}>
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {permissions?.canManageTeam && (
                      <TeamUserActions
                        member={member}
                        editingMember={editingMember}
                        setEditingMember={setEditingMember}
                        getRoleIcon={getRoleIcon}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!isLoading && !teamData?.members && (
          <p className="text-muted-foreground">
            No team members found. Start by inviting your first team member.
          </p>
        )}
        {isLoading && (
          <p className="text-muted-foreground">Loading team members... </p>
        )}
      </CardContent>
    </Card>
  );
}
