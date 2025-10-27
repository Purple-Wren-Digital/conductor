import { api } from "encore.dev/api";
import { getUserContext } from "../auth/user-context";
import { prisma } from "../ticket/db";

export interface GetCurrentUserResponse {
  id: string;
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

    if (!user) {
      throw new Error("User not found");
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
