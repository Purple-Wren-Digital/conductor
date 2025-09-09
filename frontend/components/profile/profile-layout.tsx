"use client";

import React, { useState } from "react";
import { useStore } from "@/app/store-provider";
import { useUserRole } from "@/lib/hooks/use-user-role";
// import AgentUserProfile from "@/components/profile/agent-user-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeClosed, Mail, Save, Shield, User } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

export default function UserProfileLayout() {
  const { currentUser } = useStore();
  const { role, isLoading } = useUserRole();

  // FORM VALUES
  const [formLoading, isFormLoading] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </Card>
    );
  }

  if (!currentUser || !role) {
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
          <CardTitle className="text-l font-bold">
            {currentUser?.name || "User not found"}
          </CardTitle>
          <div className="flex gap-2">
            <p className="text-l text-muted-foreground semi-bold">Agent</p>
          </div>
          <div className="flex gap-2 flex-row items-center">
            <User className="h-4 w-4" />
            <p className="text-l"> {currentUser?.id || ""}</p>
          </div>
          <div className="flex gap-2 flex-row items-center">
            {currentUser?.isActive ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeClosed className="h-4 w-4" />
            )}
            <p className="text-l">
              {currentUser?.isActive ? "Active" : "Inactive"} User
            </p>
          </div>
          <div className="flex gap-2 flex-row items-center capitalize">
            <Shield className="h-4 w-4" />
            <p className="text-l">{currentUser?.role.toLowerCase() || ""}</p>
          </div>
          <div className="flex gap-2 flex-row items-center">
            <Mail className="h-4 w-4" />
            <p className="text-l">{currentUser?.email || ""}</p>
          </div>
        </div>

        <form
          onSubmit={() => console.log("Form submit")}
          className="flex w-full justify-between items-center space-y-4 pt-8 border-t"
        >
          <div className="flex gap-3 flex-col w-1/2">
            <Label htmlFor="username">Edit Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={"First and last name"}
            />
          </div>
          <Button
            type="submit"
            variant={"secondary"}
            disabled={formLoading}
            className="gap-3"
          >
            <Save className="h-4 w-4" />
            {formLoading ? "Saving..." : "Save Profile"}
          </Button>
        </form>

        <div className="flex gap-2 flex-row mt-4 mb-4">
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
