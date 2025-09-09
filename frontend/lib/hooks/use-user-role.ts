import { useQuery } from "@tanstack/react-query";
import { getAccessToken, useUser } from "@auth0/nextjs-auth0";
import { PrismaUser } from "../types";

export type UserRole = "AGENT" | "STAFF" | "ADMIN";

export interface UserPermissions {
  canCreateTicket: boolean;
  canDeleteTicket: boolean;
  canReassignTicket: boolean;
  canBulkUpdate: boolean;
  canViewAllTickets: boolean;
  canViewInternalComments: boolean;
  canCreateInternalComments: boolean;
  canManageTeam: boolean;
  canChangeUserRoles: boolean;
  canAccessSettings: boolean;
  canAccessReports: boolean;
}

// export interface PrismaUser {
//   id: string;
//   email: string;
//   name: string;
//   role: UserRole;
//   marketCenterId: string | null;
//   marketCenter?: {
//     id: string;
//     name: string;
//   } | null;
// }

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
        canManageTeam: true,
        canChangeUserRoles: true,
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
        canManageTeam: true,
        canChangeUserRoles: false,
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
        canManageTeam: false,
        canChangeUserRoles: false,
        canAccessSettings: false,
        canAccessReports: false,
      };
  }
}

export function useUserRole() {
  const { user: auth0User, isLoading: auth0Loading } = useUser();

  const {
    data: PrismaUser,
    isLoading: userLoading,
    error,
  } = useQuery<PrismaUser>({
    queryKey: ["CurrentUser"],
    queryFn: async () => {
      // if (process.env.NODE_ENV === "development") {
      //   return {
      //     id: "local-dev-user",
      //     email: "local@localhost.com",
      //     name: "Local Dev User",
      //     role: "ADMIN" as UserRole,
      //     marketCenterId: null,
      //   };
      // }

      const accessToken = await getAccessToken();
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      return response.json();
    },
    enabled: !!auth0User || process.env.NODE_ENV === "development",
    staleTime: 5 * 60 * 1000,
  });

  const role = PrismaUser?.role as UserRole | undefined;
  const permissions = role ? getUserPermissions(role) : null;

  return {
    user: PrismaUser,
    role,
    permissions,
    isLoading: auth0Loading || userLoading,
    error,
    isAdmin: role === "ADMIN",
    isStaff: role === "STAFF",
    isAgent: role === "AGENT",
  };
}
