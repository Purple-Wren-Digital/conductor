import { api, APIError } from "encore.dev/api";
import { ticketAttachments } from "./bucket";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canViewTicket } from "../auth/permissions";

export interface GetDownloadUrlRequest {
  attachmentId: string;
}

export interface GetDownloadUrlResponse {
  downloadUrl: string;
  fileName: string;
  mimeType: string;
}

/**
 * Get a signed download URL for an attachment
 */
export const getDownloadUrl = api<GetDownloadUrlRequest, GetDownloadUrlResponse>(
  {
    expose: true,
    method: "GET",
    path: "/attachments/:attachmentId/download-url",
    auth: true,
  },
  async ({ attachmentId }) => {
    try {
      const userContext = await getUserContext();

      // Get attachment details
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: {
          ticket: true,
        },
      });

      if (!attachment) {
        throw APIError.notFound("Attachment not found");
      }

      // Check if user has permission to view the ticket
      const hasPermission = await canViewTicket(userContext, attachment.ticketId);
      if (!hasPermission) {
        throw APIError.permissionDenied(
          "You do not have permission to view this attachment"
        );
      }

      // Generate signed download URL (valid for 1 hour)
      const downloadUrl = await ticketAttachments.signedDownloadUrl(
        attachment.bucketKey,
        {
          ttl: 3600, // 1 hour
        }
      );

      return {
        downloadUrl: downloadUrl.url,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
      };
    } catch (error) {
      console.error("Failed to get download URL:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to get download URL");
    }
  }
);