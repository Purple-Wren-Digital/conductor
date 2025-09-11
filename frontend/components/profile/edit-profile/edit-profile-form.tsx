"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/app/store-provider";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api/utils";
import { PrismaUser, Ticket } from "@/lib/types";
import { parseJsonSafe } from "@/lib/utils";
import { RotateCcw, Save } from "lucide-react";
import { User } from "@auth0/nextjs-auth0/types";
import { toast } from "sonner";

type TicketWithUpdatedAt = Ticket & { updatedAt?: string | Date };

const EditUserProfile = () => {
  const { currentUser, setCurrentUser } = useStore();

  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [firstName, setFirstName] = useState<string>(
    currentUser?.name ? currentUser?.name.split(" ")[0] : ""
  );
  const [lastName, setLastName] = useState<string>(
    currentUser?.name ? currentUser?.name.split(" ")[1] : ""
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const firstNameInputRef = useRef<HTMLInputElement | null>(null);
  const lastNameInputRef = useRef<HTMLInputElement | null>(null);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const refreshAllData = useCallback(async () => {
    setIsUpdating(true);
    try {
      const accessToken = await getAuth0AccessToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      const response = await fetch(`${API_BASE}/users/${currentUser?.id}`, {
        headers,
        cache: "no-store",
      });

      const userUpdatedData = await parseJsonSafe<{ user: PrismaUser }>(
        response
      );
      setCurrentUser(userUpdatedData.user);
    } catch (err) {
      console.error("Error refreshing current user data:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [currentUser, getAuth0AccessToken]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormLoading(true);

    if (!validateForm()) {
      setIsFormLoading(false);
      toast.error("Invalid input(s)");
      return;
    }
    // TODO: BETTER CONTEXT!!
    // if (!currentUser || currentUser?.id) {
    //   setIsFormLoading(false);
    //   throw new Error("No current user data");
    // }

    try {
      const accessToken = await getAuth0AccessToken();
      const response = await fetch(
        `${API_BASE}/users/${currentUser?.id}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          // cache: "no-store",
          body: JSON.stringify({
            id: currentUser?.id,
            name: `${firstName} ${lastName}`,
          }),
        }
      );
      if (response.ok) {
        toast.success("Profile updated");
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      toast.error("Server error: Profile not updated");
      setIsFormLoading(false);
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (firstName.trim() || lastName.trim()) {
        handleSubmit(e);
      }
    }
  };

  const handleReset = () => {
    setFirstName(currentUser?.name ? currentUser?.name.split(" ")[0] : "");
    setLastName(currentUser?.name ? currentUser?.name.split(" ")[1] : "");
    setFormErrors({});
    setIsFormLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      onReset={handleReset}
      className="space-y-4 pt-6 border-t"
    >
      <div className="flex flex-row items-center justify-between pb-5">
        <CardTitle className="text-l font-bold">Edit Profile</CardTitle>
        <Button
          variant="ghost"
          type="reset"
          disabled={isUpdating || isFormLoading}
        >
          <RotateCcw />
          <p>Reset</p>
        </Button>
      </div>

      <div className="flex w-full gap-10 items-center ">
        <div className="flex gap-3 flex-col w-1/3 h-25">
          <Label htmlFor="username">First Name</Label>
          <Input
            ref={firstNameInputRef}
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"Enter your first name"}
            className={formErrors.firstName ? "border-destructive" : ""}
          />
          {formErrors.firstName && (
            <p className="text-sm text-destructive">{formErrors.firstName}</p>
          )}
        </div>
        <div className="flex gap-3 flex-col w-1/3 h-25">
          <Label htmlFor="username">Last Name</Label>
          <Input
            ref={lastNameInputRef}
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"Enter your last name"}
            className={formErrors.lastName ? "border-destructive" : ""}
          />
          {formErrors.lastName && (
            <p className="text-sm text-destructive">{formErrors.lastName}</p>
          )}
        </div>
      </div>
      <Button
        type="submit"
        variant={"secondary"}
        disabled={isUpdating || isFormLoading}
      >
        <Save className="h-4 w-4" />
        {isFormLoading
          ? "Refreshing..."
          : isFormLoading
            ? "Saving..."
            : "Save Profile"}
      </Button>
    </form>
  );
};

export default EditUserProfile;
