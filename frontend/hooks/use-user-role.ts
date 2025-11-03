import { useQuery } from "@tanstack/react-query";
import { useUser, useAuth } from "@clerk/nextjs";
import type { PrismaUser } from "@/lib/types";
import { API_BASE } from "@/lib/api/utils";

export type UserRole = "AGENT" | "STAFF" | "ADMIN";

export interface UserPermissions {
  canCreateTicket: boolean;
  canDeleteTicket: boolean;
  canReassignTicket: boolean;
  canBulkUpdate: boolean;
  canViewAllTickets: boolean;
  canViewInternalComments: boolean;
  canCreateInternalComments: boolean;
  canCreateUsers: boolean;
  canManageAllUsers: boolean;
  canCreateTeam: boolean;
  canManageTeam: boolean;
  canManageAllMarketCenters: boolean;
  canDeactivateMarketCenters: boolean;
  canChangeUserRoles: boolean;
  canDeactivateUsers: boolean;
  canAccessSettings: boolean;
  canAccessReports: boolean;
}

export function getUserPermissions(role: UserRole): UserPermissions {
  switch (role) {
    case "ADMIN":
      return {
        canCreateTicket: true,
        canDeleteTicket: true,
        canReassignTicket: true,
        canBulkUpdate: true,
        canViewAllTickets: true,
        canViewInternalComments: true,
        canCreateInternalComments: true,
        canCreateUsers: true,
        canManageAllUsers: true,
        canCreateTeam: true,
        canManageTeam: true,
        canChangeUserRoles: true,
        canManageAllMarketCenters: true,
        canDeactivateMarketCenters: true,
        canDeactivateUsers: true,
        canAccessSettings: true,
        canAccessReports: true,
      };
    case "STAFF":
      return {
        canCreateTicket: true,
        canDeleteTicket: true,
        canReassignTicket: true,
        canBulkUpdate: true,
        canViewAllTickets: false,
        canViewInternalComments: true,
        canCreateInternalComments: true,
        canCreateUsers: false,
        canManageAllUsers: false,
        canCreateTeam: false,
        canManageTeam: true,
        canChangeUserRoles: false,
        canManageAllMarketCenters: false,
        canDeactivateMarketCenters: false,
        canDeactivateUsers: false,
        canAccessSettings: true,
        canAccessReports: false,
      };
    case "AGENT":
      return {
        canCreateTicket: false,
        canDeleteTicket: false,
        canReassignTicket: false,
        canBulkUpdate: false,
        canViewAllTickets: false,
        canViewInternalComments: false,
        canCreateInternalComments: false,
        canCreateUsers: false,
        canManageAllUsers: false,
        canCreateTeam: false,
        canManageTeam: false,
        canChangeUserRoles: false,
        canManageAllMarketCenters: false,
        canDeactivateMarketCenters: false,
        canDeactivateUsers: false,
        canAccessSettings: false,
        canAccessReports: false,
      };
  }
}

export function useUserRole() {
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useAuth();

  const {
    data: PrismaUser,
    isLoading: userLoading,
    error,
  } = useQuery<PrismaUser>({
    queryKey: ["CurrentUser"],
    queryFn: async () => {
      if (!clerkUser?.id) {
        throw new Error("Not authenticated");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(`${API_BASE}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();
      if (!data) {
        throw new Error("Failed to fetch user data");
      }
      return data as PrismaUser;
    },
    enabled: isLoaded && !!clerkUser?.id,
    staleTime: 5 * 60 * 1000,
  });
  const role = PrismaUser?.role as UserRole | undefined;
  const permissions = role ? getUserPermissions(role) : null;

  return {
    role,
    permissions,
    isLoading: !isLoaded || userLoading,
    error,
    isAdmin: role === "ADMIN",
    isStaff: role === "STAFF",
    isAgent: role === "AGENT",
  };
}
