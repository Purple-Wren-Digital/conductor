"use client";

import React, { useState } from "react";
import { useStore } from "@/context/store-provider";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api/utils";
import { PrismaUser, SurveyResults } from "@/lib/types";
import { Edit, Lock, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import UserInformation from "./user-information";

// TODO:
// (1) Update user in Clerk

const EditUserProfile = ({
  user,
  isCurrentUserProfile,
  invalidateUserQuery,
  userRatingsData,
}: {
  user: PrismaUser;
  isCurrentUserProfile: boolean;
  invalidateUserQuery: Promise<void>;
  userRatingsData?: SurveyResults;
}) => {
  const prefilledData = {
    firstName: user && user?.name ? user.name.split(" ")[0] : "",
    lastName: user && user?.name ? user.name.split(" ")[1] : "",
    email: user && user?.email ? user.email : "",
  };
  const [formData, setFormData] = useState(prefilledData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getToken } = useAuth();
  const { setCurrentUser } = useStore();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (formData.firstName && formData.lastName && formData.email) {
        handleUpdateUser(e);
      }
    }
  };

  const handleResetForm = (userData: PrismaUser) => {
    setFormData({
      firstName: userData?.name ? userData?.name.split(" ")[0] : "",
      lastName: userData?.name ? userData?.name.split(" ")[1] : "",
      email: userData?.email,
    });
    setFormErrors({});
    setIsSubmitting(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    // if (!formData.email.trim()) {
    //   errors.email = "Email is required";
    // } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    //   errors.email = "Invalid email format";
    // }

    if (
      user &&
      user?.name &&
      formData.firstName &&
      formData.firstName.trim() === user?.name.split(" ")[0] &&
      formData.lastName &&
      formData.lastName.trim() === user?.name.split(" ")[1] //&&  formData.email === user?.email
    )
      errors.general = "Please make changes";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateUserInPrisma = async (userId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        console.error("No authentication token available");
        return null;
      }

      const response = await fetch(`${API_BASE}/users/${userId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
        }),
      });
      return response;
    } catch (error) {
      console.error("Prisma - Failed to update user", error);
      return null;
    }
  };

  // const updateUserInClerk = async (clerkId: string) => {
  //   if (!isCurrentUserProfile || !clerkId) {
  //     throw new Error("Not authorized to update this profile");
  //   }
  //   try {
  //     const token = "<CLERK_BACKEND_SECRET_TOKEN>"; // process.env.CLERK_BACKEND_SECRET_TOKEN
  //     if (!token) throw new Error("No token available");

  //     const response = await fetch(
  //       `https://api.clerk.com/v1/users/${clerkId}`,
  //       {
  //         method: "PATCH",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${token}`,
  //         },
  //         body: JSON.stringify({
  //           // id: clerkId,
  //           // name: `${formData.firstName} ${formData.lastName}`,
  //           first_name: formData.firstName,
  //           last_name: formData.lastName,
  //           // notify_primary_email_address_changed:
  //           // primary_email_address_id: formData.email,
  //         }),
  //       }
  //     );
  //     if (!response || !response.ok) throw new Error("Response not okay");
  //     const data = await response.json();
  //     if (!data) throw new Error("No data from auth0");
  //     return true;
  //   } catch (error) {
  //     console.error("AUTH0 - Failed to update user", error);
  //     return false;
  //   }
  // };

  const updateUserMutation = useMutation<
    PrismaUser,
    Error,
    { userId: string; clerkId: string }
  >({
    mutationFn: async ({ userId, clerkId }) => {
      if (!isCurrentUserProfile || !userId || !clerkId)
        throw new Error("Missing User ID");

      // const clerkResponse = await updateUserInClerk(clerkId);
      // if (!clerkResponse) {
      //   throw new Error("Clerk Error");
      // }
      const prismaResponse = await updateUserInPrisma(userId);
      if (!prismaResponse) {
        throw new Error("Prisma Error");
      }
      const data = await prismaResponse.json();
      if (!data || !data?.user)
        throw new Error("Prisma - Updated data was not found");
      return data.user as PrismaUser;
    },
    onSuccess: async (data: PrismaUser) => {
      handleResetForm(data);
      setCurrentUser(data);
      toast.success("Profile updated");
    },
    onError: (error) => {
      console.error("Failed to update user", error);
      toast.error("Failed to update user");
    },
    onSettled: async () => {
      await invalidateUserQuery;
      setIsSubmitting(false);
    },
  });

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!isCurrentUserProfile) {
      setIsSubmitting(false);
      toast.error("Error: Unauthorized");
      return;
    }

    if (!validateForm()) {
      setIsSubmitting(false);
      toast.error("Error: Invalid input(s)");
      return;
    }
    updateUserMutation.mutate({
      userId: user?.id ?? "",
      clerkId: user?.clerkId ?? "",
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 mx-auto">
      <UserInformation
        user={user}
        marketCenterName={user?.marketCenter?.name}
        userRatingsData={userRatingsData}
      />

      <Card className="max-h-fit">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between">
          <CardTitle className="flex gap-2 items-center text-lg">
            <Edit className="h-4 w-4" />
            Edit Details
          </CardTitle>
          <Button
            variant="secondary"
            disabled={isSubmitting || !isCurrentUserProfile}
            aria-label="Reset Profile Form"
            className="w-fit"
            onClick={() => handleResetForm(user)}
          >
            <RotateCcw />
            Reset
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateUser} className="space-y-2">
            {/* FIRST NAME */}
            <div className="flex flex-wrap items-center justify-between space-y-2">
              <Label htmlFor="username">First Name</Label>
              <div className="w-2/3">
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      firstName: e.target.value,
                    })
                  }
                  onKeyDown={handleKeyDown}
                  placeholder={"Enter your first name"}
                  disabled={isSubmitting || !isCurrentUserProfile}
                  className={
                    (formErrors?.firstName || formErrors?.general) &&
                    "border-destructive"
                  }
                />
                <p className="text-sm text-destructive h-5 text-center mt-1">
                  {formErrors?.firstName}
                </p>
              </div>
            </div>
            {/* LAST NAME */}
            <div className="flex flex-wrap items-center justify-between space-y-2">
              <Label htmlFor="username">Last Name</Label>
              <div className="w-2/3">
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastName: e.target.value,
                    })
                  }
                  onKeyDown={handleKeyDown}
                  placeholder={"Enter your last name"}
                  disabled={isSubmitting || !isCurrentUserProfile}
                  className={
                    (formErrors.lastName || formErrors?.general) &&
                    "border-destructive"
                  }
                />
                <p className="text-sm text-destructive h-5 text-center mt-1">
                  {formErrors?.lastName}
                </p>
              </div>
            </div>
            {/* EMAIL */}
            <div className="flex flex-wrap items-center justify-between space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="w-2/3">
                <Input
                  id="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  onKeyDown={handleKeyDown}
                  placeholder={"Enter your email"}
                  disabled // TODO: CLERK EMAIL API ROUTES
                  // disabled={isSubmitting || !isCurrentUserProfile}
                  className={
                    (formErrors?.email || formErrors?.general) &&
                    "border-destructive"
                  }
                />
                <p className="text-sm text-destructive h-5 text-center mt-1">
                  {formErrors?.email} {formErrors?.general}
                </p>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || !isCurrentUserProfile}
              aria-label="Submit updates for profile"
              className="w-full"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* TODO: CLERK PASSWORD RESET */}
      <Card className="max-h-fit">
        <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-4 ">
          <div className="flex flex-col gap-2">
            <CardTitle className="flex gap-2 items-center text-lg">
              <Lock className="h-4 w-4" />
              Reset Password
            </CardTitle>
            <CardDescription>
              Send a password reset email to your registered email address. This
              link will expire after 5 days.
            </CardDescription>
          </div>
          <Button
            className="w-full sm:w-fit"
            disabled //</CardHeader>={!isCurrentUserProfile || !user?.clerkId}
            // onClick={handleResetRequest}
          >
            Send Reset Email
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
};

export default EditUserProfile;
