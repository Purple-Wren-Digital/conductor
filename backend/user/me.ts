import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";

export interface GetCurrentUserResponse {
  // user: User;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  marketCenterId: string | null;
  marketCenter?: {
    id: string;
    name: string;
  } | null;
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

    const user = await prisma.user.findUnique({
      where: { id: userContext.userId },
      include: { marketCenter: true },
    });

    if (!user || !user?.id) {
      throw APIError.notFound("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      role: user.role,
      isActive: user.isActive,
      marketCenterId: user.marketCenterId,
      marketCenter: user.marketCenter
        ? {
            id: user.marketCenter.id,
            name: user.marketCenter.name,
          }
        : null,
    };
  }
);
