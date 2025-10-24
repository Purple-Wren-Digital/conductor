import { Suspense } from "react";
import UserManagementTabs from "@/components/ui/users/user-management-tabs";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Admin — User Management
        </h1>
        <p className="text-muted-foreground">
          Create, edit, and manage users & roles.
        </p>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <UserManagementTabs />
      </Suspense>
    </div>
  );
}
