import { api, APIError } from "encore.dev/api";
import {
  userRepository,
  userMarketCenterRepository,
  marketCenterRepository,
} from "../ticket/db";
import { getUserContext } from "../auth/user-context";

export interface GetCurrentUserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  isSuperuser: boolean;
  marketCenterId: string | null;
  marketCenter?: {
    id: string;
    name: string;
  } | null;
  marketCenters?: {
    id: string;
    name: string;
  }[];
}

export const me = api<void, GetCurrentUserResponse>(
  {
    expose: true,
    method: "GET",
    path: "/users/me",
    auth: true,
  },
  async () => {
    const userContext = await getUserContext();

    const user = await userRepository.findByIdWithMarketCenter(userContext.userId);

    if (!user || !user?.id) {
      throw APIError.notFound("User not found");
    }

    // Superusers see all MCs; regular users see only their assigned ones
    let marketCenters: { id: string; name: string }[];
    if (user.isSuperuser) {
      const allMCs = await marketCenterRepository.findAll();
      marketCenters = allMCs.map((mc) => ({ id: mc.id, name: mc.name }));
    } else {
      marketCenters =
        await userMarketCenterRepository.findMarketCentersByUserId(user.id);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      role: user.role,
      isActive: user.isActive,
      isSuperuser: user.isSuperuser ?? false,
      marketCenterId: user.marketCenterId,
      marketCenter: user.marketCenter
        ? {
            id: user.marketCenter.id,
            name: user.marketCenter.name,
          }
        : null,
      marketCenters,
    };
  }
);
