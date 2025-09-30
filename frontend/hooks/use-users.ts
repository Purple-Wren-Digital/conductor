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
  usersQueryKey: readonly ["users", Record<string, string>];
  queryParams: URLSearchParams;
  role?: UserRole;
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
          `/api/users/search?${queryParams.toString()}`,
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
