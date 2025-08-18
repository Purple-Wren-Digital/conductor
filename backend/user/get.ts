import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { User } from "../ticket/types";

export interface GetUserRequest {
    id: string;
}

export interface GetUserResponse {
    user: User;
}

export const get = api<GetUserRequest>(
    {expose: true, method: "GET", path: "/users/:id", auth: true},
    async (req) => {
        const user = await prisma.user.findUnique({
            where: { id: req.id },
        })

        if (!user) {
            throw APIError.notFound("user not found");
        }

        return { user }
    }
)