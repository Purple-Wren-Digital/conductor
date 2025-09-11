"use client";

import React from "react";
import { useStore } from "@/app/store-provider";
import { useUserRole } from "@/lib/hooks/use-user-role";
import EditUserProfile from "@/components/profile/edit-profile/edit-profile-form";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { IdCard, Mail, User } from "lucide-react";
import { getRoleDescription, ROLE_ICONS } from "@/lib/utils";

export default function UserProfileLayout() {
  const { currentUser } = useStore();
  const { role, isLoading } = useUserRole();

  const getRoleIcon = () => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS];
    return Icon ? <Icon className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </Card>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Unable to find your profile information. Please contact support.
        </p>
      </div>
    );
  }
  return (
    <Card className="pt-6 pb-6 space-4">
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-col pb-4">
          <CardTitle className="text-xl font-bold pb-2">
            {currentUser?.name || "User not found"}
          </CardTitle>

          <div className="flex gap-2 flex-row items-center">
            <IdCard className="h-4 w-4" />
            <p className="text-l"> {currentUser?.id || ""}</p>
          </div>

          <div className="flex gap-2 flex-row items-center">
            <Mail className="h-4 w-4" />
            <p className="text-l"> {currentUser?.email || ""}</p>
          </div>

          <div className="flex gap-2 flex-row items-center ">
            {getRoleIcon()}
            <p className="text-l capitalize">
              {`${currentUser?.role.toLowerCase()} Role:` || ""}
            </p>
            <p className="text-l text-muted-foreground semi-bold">
              {getRoleDescription(role)}
            </p>
          </div>
        </div>
        {role !== "AGENT" && <EditUserProfile />}

        <div className="flex gap-2 flex-row mt-8 mb-4">
          <p className="text-xs text-muted-foreground">
            {currentUser?.createdAt
              ? `Created on ${new Date(
                  currentUser.createdAt
                ).toLocaleDateString()}`
              : ""}
          </p>
          <p className="text-xs text-muted-foreground">|</p>
          <p className="text-xs text-muted-foreground">
            {currentUser?.updatedAt
              ? `Updated on ${new Date(
                  currentUser.updatedAt
                ).toLocaleDateString()} at ${new Date(
                  currentUser.updatedAt
                ).toLocaleTimeString()}`
              : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
