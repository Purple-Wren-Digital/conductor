import { API_BASE } from "@/lib/api/utils";
import { PrismaUser, UserRole, UserWithStats } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

// GET ALL USERS
type SearchUsersQuery = {
  usersQueryKey: readonly [string, Record<string, string>];
  queryParams: URLSearchParams;
  role?: UserRole;
  marketCenterId?: string;
  clerkId?: string;
};

export function useFetchAllUsers({
  usersQueryKey,
  queryParams,
  role,
  clerkId,
}: SearchUsersQuery) {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      if (role !== "ADMIN")
        throw new Error("Must be an admin to view all users");
      if (!clerkId) throw new Error("Not authenticated");
      try {
        const response = await fetch(
          `${API_BASE}/users/search?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${clerkId}`,
            },
          }
        );
        // console.log("USERS - RESPONSE", response);
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        // console.log("USERS DATA", data);
        if (!data || !data?.users || !data?.total)
          throw new Error("Failed to fetch users");
        const usersWithStats: UserWithStats[] = data.users.map(
          (user: PrismaUser) => ({
            ...user,
            createdAt: new Date(user.createdAt),
            ticketsAssigned: 0,
            ticketsCreated: 0,
            lastActive: new Date(),
          })
        );
        return { users: usersWithStats as UserWithStats[], total: data?.total };
      } catch (error) {
        console.error("Failed to fetch all users", error);
        return { users: [] as UserWithStats[] };
      }
    },
    enabled: !!clerkId && role === "ADMIN",
  });
}

// MARKET CENTER USERS
export function useFetchUsersWithinMarketCenter({
  usersQueryKey,
  queryParams,
  role,
  marketCenterId,
  clerkId,
}: SearchUsersQuery) {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      if (!clerkId) throw new Error("Not authenticated");
      if (role === "AGENT" || !marketCenterId)
        throw new Error("Must be an admin or staff to view team members");
      try {
        const response = await fetch(
          `${API_BASE}/users/search?marketCenterId=${marketCenterId}&${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${clerkId}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        if (!data || !data?.users || !data?.total)
          throw new Error("Failed to fetch users");
        const usersWithStats: UserWithStats[] = data.users.map(
          (user: PrismaUser) => ({
            ...user,
            createdAt: new Date(user.createdAt),
            ticketsAssigned: 0,
            ticketsCreated: 0,
            lastActive: new Date(),
          })
        );
        return { users: usersWithStats as UserWithStats[], total: data?.total };
      } catch (error) {
        console.error("Failed to fetch all users", error);
        return { users: [] as UserWithStats[] };
      }
    },
    enabled: !!clerkId && !!marketCenterId && role !== "AGENT",
  });
}

// FETCH USER
export function useFetchOneUser({
  id,
  clerkId,
}: {
  id?: string;
  clerkId?: string;
}) {
  return useQuery({
    queryKey: ["user-profile", id],
    queryFn: async () => {
      if (!clerkId) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/users/${id}`, {
        headers: {
          Authorization: `Bearer ${clerkId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return data?.user;
    },
    enabled: !!id && !!clerkId,
  });
}


export function useFetchOneUserByEmail({
  email,
  clerkId,
}: {
  email?: string;
  clerkId?: string;
}) {
  return useQuery({
    queryKey: ["user-profile", email],
    queryFn: async () => {
      if (!clerkId) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE}/users/email/${email}`, {
        headers: {
          Authorization: `Bearer ${clerkId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return data?.user;
    },
    enabled: !!email && !!clerkId,
  });
}
