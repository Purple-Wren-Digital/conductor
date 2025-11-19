"use client";

import { useUserRole } from "@/hooks/use-user-role";
import { AgentDashboard } from "@/components/dashboard/agent-dashboard";
import { StaffDashboard } from "@/components/dashboard/staff-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { StaffLeaderDashboard } from "@/components/dashboard/staff-leader-dashboard";

export default function DashboardPage() {
  const { role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  switch (role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "STAFF":
      return <StaffDashboard />;
    case "STAFF_LEADER":
      return <StaffLeaderDashboard />;
    case "AGENT":
      return <AgentDashboard />;
    default:
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Unable to determine your role. Please contact support.
          </p>
        </div>
      );
  }
}
