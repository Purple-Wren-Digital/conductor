import { API_BASE } from "@/lib/api/utils";
import { PrismaUser, UserRole, UserWithStats } from "@/lib/types";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { useQuery } from "@tanstack/react-query";

const getAuth0AccessToken = async () => {
  if (process.env.NODE_ENV === "development") return "local";
  return await getAccessToken();
};

// GET ALL USERS
type SearchUsersQuery = {
  usersQueryKey: readonly [string, Record<string, string>];
  queryParams: URLSearchParams;
  role?: UserRole;
  marketCenterId?: string;
};

export function useFetchAllUsers({
  usersQueryKey,
  queryParams,
  role,
}: SearchUsersQuery) {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      if (role !== "ADMIN")
        throw new Error("Must be an admin to view all users");
      try {
        const accessToken = await getAuth0AccessToken();
        const response = await fetch(
          `${API_BASE}/users/search?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
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
    enabled: role === "ADMIN",
  });
}

// MARKET CENTER USERS
export function useFetchUsersWithinMarketCenter({
  usersQueryKey,
  queryParams,
  role,
  marketCenterId,
}: SearchUsersQuery) {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      if (role === "AGENT" || !marketCenterId)
        throw new Error("Must be an admin or staff to view team members");
      try {
        const accessToken = await getAuth0AccessToken();
        const response = await fetch(
          `${API_BASE}/users/search?marketCenterId=${marketCenterId}&${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
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
    enabled: !!marketCenterId && role !== "AGENT",
  });
}

// FETCH USER
export function useFetchOneUser(id?: string) {
  return useQuery({
    queryKey: ["user-profile", id],
    queryFn: async () => {
      if (!id) return {};
      const accessToken = await getAuth0AccessToken();
      const response = await fetch(`${API_BASE}/users/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return data?.user;
    },
    enabled: !!id,
  });
}

