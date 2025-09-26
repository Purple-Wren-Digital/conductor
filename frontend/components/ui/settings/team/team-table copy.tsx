"use client";

import { useState } from "react";
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
import EditTeamMemberModal from "@/components/ui/settings/team/team-management-edit-user";
import RemoveTeamMemberModal from "@/components/ui/settings/team/team-management-remove-user";
import { Badge } from "@/components/ui/badge";
import { MinusCircle, User } from "lucide-react";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { ROLE_COLORS, ROLE_ICONS } from "@/lib/utils";
import { useStore } from "@/app/store-provider";
import { MarketCenter, PrismaUser } from "@/lib/types";
import { Button } from "@/components/ui/button";

type TeamManagementTableProps = {
  marketCenter: MarketCenter | null;
  isLoading: boolean;
};

export default function TeamTable({
  marketCenter,
  isLoading,
}: TeamManagementTableProps) {
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<PrismaUser>({} as PrismaUser);

  const [showRemoveUserForm, setShowRemoveUserForm] = useState(false);
  const [userToRemove, setUserToRemove] = useState<PrismaUser>(
    {} as PrismaUser
  );
  const { currentUser } = useStore();
  const { permissions } = useUserRole();

  const teamMembers: PrismaUser[] =
    marketCenter && marketCenter?.users ? marketCenter?.users : [];
  const teamMemberCount = teamMembers ? teamMembers.length : "0";

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

  const openRemoveUserModal = (user: PrismaUser) => {
    setUserToRemove(user);
    setEditingUser({} as PrismaUser);
    setShowRemoveUserForm(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Team Members</CardTitle>
        <CardDescription>{teamMemberCount} Active Members</CardDescription>
      </CardHeader>
      <CardContent className="min-h-10">
        {/* {!isLoading && teamMembers && teamMembers.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name & Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Edit</TableHead>
                <TableHead className="text-center">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers &&
                teamMembers.length > 0 &&
                teamMembers.map((member, index) => {
                  const self = member.id === currentUser?.id;
                  const cannotUpdateAdmin =
                    member.role === "ADMIN" && currentUser?.role !== "ADMIN";

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {member.name}
                            {self && " (You)"}
                          </div>
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
                        <Badge
                          variant={member.isActive ? "default" : "secondary"}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {/* EDIT */}

                        <EditTeamMemberModal
                          self={self}
                          cannotUpdateAdmin={cannotUpdateAdmin}
                          editingTeamMember={member}
                          // setEditingTeamMember={setEditingTeamMember}
                          getRoleIcon={getRoleIcon}
                          showEditUserForm={showEditUserForm}
                          setShowEditUserForm={setShowEditUserForm}
                        />
                      </TableCell>
                      {/* REMOVE */}
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:text-destructive"
                          disabled={
                            self ||
                            cannotUpdateAdmin ||
                            !permissions?.canManageTeam
                          }
                          onClick={() => openRemoveUserModal(member)}
                        >
                          <MinusCircle className="h-4 w-4" />
                          <p>Remove</p>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )} */}
                      {!isLoading && teamMembers &&
                teamMembers.length > 0 &&
                teamMembers.map((member, index) => {
                  const self = member.id === currentUser?.id;
                  const cannotUpdateAdmin =
                    member.role === "ADMIN" && currentUser?.role !== "ADMIN";

                  return ()}
        {!isLoading && (!teamMembers || !teamMembers.length) && (
          <p className="text-muted-foreground">
            No team members found. Start by inviting your first team member.
          </p>
        )}
        {isLoading && (
          <p className="text-muted-foreground">Loading team members... </p>
        )}
      </CardContent>

      <RemoveTeamMemberModal
        marketCenter={marketCenter}
        userToRemove={userToRemove}
        setUserToRemove={setUserToRemove}
        showRemoveUserForm={showRemoveUserForm}
        setShowRemoveUserForm={setShowRemoveUserForm}
      />
    </Card>
  );
}
