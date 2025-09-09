"use client";

import { getAccessToken } from "@auth0/nextjs-auth0";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User, UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Search, Plus, Users, Shield, Mail } from "lucide-react";
import { useCallback } from "react";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useUser } from "@auth0/nextjs-auth0";

// Temporary solution?
// THIS IS SO THAT USERS CAN CREATE THEMSELF AS AN ENTRY IN PRISMA

type NewUserOnboardingProps = {
  auth0Id: string;
};

export default function NewUserOnBoarding() {
  //{ auth0Id }: NewUserOnboardingProps
  const getAuthToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);
  const { user } = useUser();

  console.log("user", user);

  const handleVerifyInformation = () => {};

  return (
    <div style={{ padding: "20px" }}>
      <Card style={{ height: "95vh" }}>
        <CardHeader>
          <CardTitle>
            Welcome, {user?.nickname || user?.name || "User"}!
          </CardTitle>
          <p>
            Before we get started, please verify this information is correct:
          </p>
          <div
            style={{
              marginTop: "20px",
              // marginBottom: "20px",
              backgroundColor: "lightgrey",
              height: "1px",
            }}
          />
        </CardHeader>
        <CardContent>
          <p>
            <b>Email:</b> {user && user.email}
          </p>
          {/* <p>
            <b>Name:</b> {user && user.name}
          </p> */}
          <p>
            <b>Name: </b>
            {user && user.nickname}
          </p>
          {/* <div
            style={{
              marginTop: "20px",
              marginBottom: "20px",
              backgroundColor: "lightgrey",
              height: "1px",
            }}
          /> */}
          {/* <p>If any of that looks incorrect, congrats! you are fucked.</p> */}
        </CardContent>
      </Card>
    </div>
  );
}
