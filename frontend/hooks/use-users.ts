import { API_BASE } from "@/lib/api/utils";
import { PrismaUser, UserRole, UserWithStats } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

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
  const { getToken } = useAuth();

  return useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      if (role !== "ADMIN")
        throw new Error("Must be an admin to view all users");

      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");

      try {
        const response = await fetch(
          `${API_BASE}/users/search?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
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
      } catch {
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
  const { getToken } = useAuth();

  return useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      if (role === "AGENT" || !marketCenterId)
        throw new Error("Must be an admin or staff to view team members");

      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");

      try {
        const response = await fetch(
          `${API_BASE}/users/search?marketCenterId=${marketCenterId}&${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
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
      } catch {
        return { users: [] as UserWithStats[] };
      }
    },
    enabled: !!marketCenterId && role !== "AGENT",
  });
}

// FETCH USER
export function useFetchOneUser({ id }: { id?: string }) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["user-profile", id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");

      const response = await fetch(`${API_BASE}/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return data;
    },
    enabled: !!id,
  });
}

export function useFetchOneUserByEmail({ email }: { email?: string }) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["user-profile", email],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");

      const response = await fetch(`${API_BASE}/users/email/${email}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return data?.user;
    },
    enabled: !!email,
  });
}

export function useFetchUserSettings({
  id,
  notificationsQueryKey,
}: {
  id?: string;
  notificationsQueryKey: (string | undefined)[];
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: async () => {
      if (!id) throw new Error("Missing user id");

      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");

      try {
        const response = await fetch(`${API_BASE}/users/${id}/settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch user settings");
        const data = await response.json();

        return data;
      } catch {
        return {};
      }
    },
    enabled: !!id,
  });
}
