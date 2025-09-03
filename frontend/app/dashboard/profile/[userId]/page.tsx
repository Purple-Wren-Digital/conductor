import * as React from "react";
import UserProfileLayout from "@/components/ui/profile/user-profile-layout";

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  return <UserProfileLayout  />;
}
