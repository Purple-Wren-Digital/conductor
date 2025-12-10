import { api, APIError } from "encore.dev/api";
import { ticketAttachments } from "./bucket";
import { db } from "../ticket/db";
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
      const attachment = await db.queryRow<{
        id: string;
        ticket_id: string;
        bucket_key: string;
        file_name: string;
        mime_type: string;
      }>`
        SELECT id, ticket_id, bucket_key, file_name, mime_type
        FROM attachments
        WHERE id = ${attachmentId}
      `;

      if (!attachment) {
        throw APIError.notFound("Attachment not found");
      }

      // Check if user has permission to view the ticket
      const hasPermission = await canViewTicket(userContext, attachment.ticket_id);
      if (!hasPermission) {
        throw APIError.permissionDenied(
          "You do not have permission to view this attachment"
        );
      }

      // Generate signed download URL (valid for 1 hour)
      const downloadUrl = await ticketAttachments.signedDownloadUrl(
        attachment.bucket_key,
        {
          ttl: 3600, // 1 hour
        }
      );

      return {
        downloadUrl: downloadUrl.url,
        fileName: attachment.file_name,
        mimeType: attachment.mime_type,
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to get download URL");
    }
  }
);