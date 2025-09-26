import { API_BASE } from "@/lib/api/utils";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { useQuery } from "@tanstack/react-query";

const getAuth0AccessToken = async () => {
  if (process.env.NODE_ENV === "development") return "local";
  return await getAccessToken();
};

// GET MARKET CENTER BY ID
export function useFetchMarketCenter(marketCenterId: string) {
  return useQuery({
    queryKey: ["get-market-center", marketCenterId],
    queryFn: async () => {
      if (!marketCenterId) {
        throw new Error("No Market Center ID");
      }
      try {
        const accessToken = await getAuth0AccessToken();
        const response = await fetch(
          `${API_BASE}/marketCenters/${marketCenterId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (!response || !response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        return data?.marketCenter;
      } catch (error) {
        console.error("Failed to fetch market center - ", error);
        return null;
      }
    },
    enabled: !!marketCenterId,
  });
}

// GET TICKETS WITHIN MARKET CENTER
export function useFetchMarketCenterTickets(marketCenterId: string) {
  return useQuery({
    queryKey: ["list-market-center-tickets", marketCenterId],
    queryFn: async () => {
      if (!marketCenterId) {
        return [];
      }

      try {
        const accessToken = await getAuth0AccessToken();
        const response = await fetch(
          `${API_BASE}/tickets/search?marketCenterId=${marketCenterId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (!response || !response.ok)
          throw new Error("Failed to fetch tickets");
        const data = await response.json();
        console.log(data);
        return data;
      } catch (error) {
        console.error("StaffDashboard - Failed to fetch team tickets", error);
        return [];
      }
    },
    enabled: !!marketCenterId,
  });
}
