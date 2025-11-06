import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canViewTicket } from "../auth/permissions";

export interface ListAttachmentsRequest {
  ticketId: string;
}

export interface AttachmentInfo {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploaderName: string;
  createdAt: Date;
}

export interface ListAttachmentsResponse {
  attachments: AttachmentInfo[];
}

/**
 * List all attachments for a ticket
 */
export const list = api<ListAttachmentsRequest, ListAttachmentsResponse>(
  {
    expose: true,
    method: "GET",
    path: "/attachments/ticket/:ticketId",
    auth: true,
  },
  async ({ ticketId }) => {
    try {
      const userContext = await getUserContext();

      // Check if user has permission to view the ticket
      const hasPermission = await canViewTicket(userContext, ticketId);
      if (!hasPermission) {
        throw APIError.permissionDenied(
          "You do not have permission to view attachments for this ticket"
        );
      }

      // Get all attachments for the ticket
      const attachments = await prisma.attachment.findMany({
        where: { ticketId },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        attachments: attachments.map((attachment) => ({
          id: attachment.id,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          uploadedBy: attachment.uploadedBy,
          uploaderName: attachment.uploader.name || attachment.uploader.email,
          createdAt: attachment.createdAt,
        })),
      };
    } catch (error) {
      console.error("Failed to list attachments:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to list attachments");
    }
  }
);