import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../auth/user-context";
import { prisma } from "../ticket/db";
import { ticketFilesBucket } from "../buckets";

export interface DeleteFileRequest {
  fileId: string;
}

export interface DeleteFileResponse {
  success: boolean;
}

export const deleteTicketFile = api<DeleteFileRequest, DeleteFileResponse>(
  { expose: true, method: "DELETE", path: "/files/:fileId", auth: false },
  async (req) => {
    // const userContext = await getUserContext();

    const file = await prisma.file.findUnique({
      where: {
        id: req.fileId,
      },
    });
    // const exists =
    //   file && file?.filename
    //     ? await ticketFilesBucket.exists(file?.filename)
    //     : false;

    if (!file || !file?.filename) {
      throw APIError.notFound("File not found");
    }
    await ticketFilesBucket.remove(file.filename);
    const awsDeleted = !(await ticketFilesBucket.exists(file.filename));
    const prismaDelete = await prisma.file.delete({
      where: {
        id: req.fileId,
      },
    });

    return { success: awsDeleted && prismaDelete } as DeleteFileResponse;
  }
);
