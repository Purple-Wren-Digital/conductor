"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/context/store-provider";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api/utils";
import { PrismaUser } from "@/lib/types";
import { parseJsonSafe } from "@/lib/utils";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

const EditUserProfile = () => {
  const { currentUser, setCurrentUser } = useStore();
  const { user: clerkUser } = useUser();

  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [firstName, setFirstName] = useState<string>(
    currentUser?.name ? currentUser?.name.split(" ")[0] : ""
  );
  const [lastName, setLastName] = useState<string>(
    currentUser?.name ? currentUser?.name.split(" ")[1] : ""
  );
  const [email, setEmail] = useState<string>(currentUser?.email || "");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const lastFetchedUpdatedAtRef = useRef<string | null>(null);

  const { getToken } = useAuth();

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    if (!email.trim()) {
      errors.email = "Required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email format";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(
        `${API_BASE}/users/${currentUser?.id}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // cache: "no-store",
          body: JSON.stringify({
            id: currentUser?.id,
            name: `${firstName} ${lastName}`,
            email: email,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();

        if (!data || !data?.user) {
          throw new Error("No current user data");
        }
        setCurrentUser(data.user);
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
    setEmail(currentUser?.email || "");
    setFormErrors({});
    setIsFormLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      onReset={handleReset}
      className="pt-6 border-t"
    >
      <div className="flex flex-row items-center justify-between pb-5">
        <CardTitle className="text-l font-bold">Edit Profile</CardTitle>
        <div className="flex flex-row items-center gap-4">
          <Button
            variant="secondary"
            type="reset"
            disabled={isUpdating || isFormLoading}
            aria-label="Reset Profile Form"
          >
            <RotateCcw />
          </Button>
          <Button
            type="submit"
            disabled={isUpdating || isFormLoading}
            aria-label="Submit updates for profile"
          >
            <Save className="h-4 w-4" />
            {isFormLoading
              ? "Refreshing..."
              : isFormLoading
                ? "Saving..."
                : "Save Profile"}
          </Button>
        </div>
      </div>

      <div className="flex w-full gap-3 items-center flex-wrap">
        <div className="flex gap-3 flex-col w-1/3">
          <Label htmlFor="username">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"Enter your first name"}
            className={formErrors?.firstName && "border-destructive"}
          />
          <p className="text-sm text-destructive h-5">
            {formErrors?.firstName}
          </p>
        </div>
        <div className="flex gap-3 flex-col w-1/3">
          <Label htmlFor="username">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"Enter your last name"}
            className={formErrors.lastName && "border-destructive"}
          />
          <p className="text-sm text-destructive  h-5">
            {formErrors?.lastName}
          </p>
        </div>
        <div className="flex gap-3 flex-col w-1/3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"Enter your email"}
            className={formErrors?.email && "border-destructive"}
          />
          <p className="text-sm text-destructive  h-5">{formErrors?.email}</p>
        </div>
      </div>
    </form>
  );
};

export default EditUserProfile;
