import { api, APIError } from "encore.dev/api"
import { prisma } from "../ticket/db"

export interface DeleteUserRequest {
    id: string;
}

export interface DeleteUserResponse {
    success: boolean;
    message: string;
}

export const deleteUser = api<DeleteUserRequest, DeleteUserResponse>(
    { expose: true, method: "DELETE", path: "/users/:id", auth: true },
    async (req) => {
        const mockUserId = "user_1";
        const mockUserRole = "ADMIN";

        const user = await prisma.user.findUnique({
            where: {id: req.id }
        })

        if (!user) {
            throw APIError.notFound("User not found")
        }

        const isAdmin = mockUserRole === "ADMIN"
        const isCreator = mockUserId === user.id;

        if (!isAdmin && !isCreator) {
            throw APIError.permissionDenied("Only admins and the actual user can delete the user.")
        }

        await prisma.user.delete({
            where: {id: req.id},
        })

        return {
            success: true,
            message: "User deleted successfully"
        }
    }
)