"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/context/store-provider";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api/utils";
import { PrismaUser, SurveyResults } from "@/lib/types";
import { Edit, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import UserInformation from "./user-information";

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

  const userNameForm = useMemo(
    () => `${formData?.firstName.trim()} ${formData?.lastName.trim()}`,
    [formData]
  );

  const updates = useMemo(() => {
    const hasNameChanged: boolean = user && userNameForm !== user?.name;
    const hasEmailChanged: boolean = formData?.email !== user?.email;
    const userUpdatesMade = hasNameChanged || hasEmailChanged;
    return { hasNameChanged, hasEmailChanged, userUpdatesMade };
  }, [userNameForm, formData, user]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData?.firstName || !formData?.firstName.trim())
      errors.firstName = "First name is required";
    if (!formData?.lastName || !formData?.lastName.trim())
      errors.lastName = "Last name is required";

    if (!formData?.email || !formData?.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (!formData || !updates.userUpdatesMade)
      errors.general = "Please update at least one field to continue";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateUserMutation = useMutation<PrismaUser, Error, { userId: string }>(
    {
      mutationFn: async ({ userId }) => {
        if (!isCurrentUserProfile || !userId)
          if (!userId) throw new Error("Missing User ID");

        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        const response = await fetch(`${API_BASE}/users/${userId}/update`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();
        if (!data || !data?.user)
          throw new Error("Prisma - Updated data was not found");
        return data.user as PrismaUser;
      },
      onSuccess: async (data: PrismaUser) => {
        handleResetForm(data);
        setCurrentUser(data);
        toast.success("Profile updated");
      },
      onError: () => {
        toast.error("Failed to update user");
      },
      onSettled: async () => {
        await invalidateUserQuery;
        setIsSubmitting(false);
      },
    }
  );

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
    updateUserMutation.mutate({ userId: user?.id ?? "" });
  };

  return (
    <div className="space-y-6">
      <UserInformation
        user={user}
        marketCenterName={user?.marketCenter?.name}
        userRatingsData={userRatingsData}
      />

      <section className="max-h-fit">
        <div className="flex flex-row flex-wrap items-center justify-between space-y-4 mb-4">
          <p className="flex gap-2 items-center text-lg font-medium">
            <Edit className="h-4 w-4" />
            Edit Details
          </p>
        </div>
        <form
          onSubmit={handleUpdateUser}
          className="space-y-2 lg:flex lg:flex-row lg:flex-wrap lg:gap-4 lg:items-center"
        >
          {/* FIRST NAME */}
          <div className="space-y-2">
            <Label htmlFor="username">First Name</Label>
            <div className="w-full">
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
          <div className="space-y-2">
            <Label htmlFor="username">Last Name</Label>
            <div className="w-full">
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
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="w-full">
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
                disabled={isSubmitting || !isCurrentUserProfile}
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
          <div className="flex flex-wrap gap-4 md:justify-end md:space-y-2">
            <Button
              variant="secondary"
              disabled={isSubmitting || !isCurrentUserProfile}
              aria-label="Reset Profile Form"
              className="w-full md:w-fit border"
              onClick={() => handleResetForm(user)}
            >
              <RotateCcw />
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isCurrentUserProfile}
              aria-label="Submit updates for profile"
              className="w-full md:w-fit"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </section>

      {/* TODO: CLERK PASSWORD RESET */}
      {/* <Card className="max-h-fit">
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
      </Card> */}
    </div>
  );
};

export default EditUserProfile;
