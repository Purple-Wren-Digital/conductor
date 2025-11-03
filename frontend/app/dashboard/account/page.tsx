import * as React from "react";
import { Suspense } from "react";
import AccountLayout from "@/components/account/account-layout";

export default function AccountPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Manage Account</h1>
        <p className="text-muted-foreground">
          Update your profile information and notification settings
        </p>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <AccountLayout />
      </Suspense>
    </div>
  );
}
