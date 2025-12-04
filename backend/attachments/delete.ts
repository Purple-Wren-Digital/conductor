import { api, APIError } from "encore.dev/api";
import { ticketAttachments } from "./bucket";
import { db } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canModifyTicket } from "../auth/permissions";

export interface DeleteAttachmentRequest {
  attachmentId: string;
}

export interface DeleteAttachmentResponse {
  success: boolean;
}

/**
 * Delete an attachment
 */
export const deleteAttachment = api<
  DeleteAttachmentRequest,
  DeleteAttachmentResponse
>(
  {
    expose: true,
    method: "DELETE",
    path: "/attachments/:attachmentId",
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
        uploaded_by: string;
      }>`
        SELECT id, ticket_id, bucket_key, uploaded_by
        FROM attachments
        WHERE id = ${attachmentId}
      `;

      if (!attachment) {
        throw APIError.notFound("Attachment not found");
      }

      // Check if user has permission to update the ticket (only those who can update can delete attachments)
      const hasPermission = await canModifyTicket(
        userContext,
        attachment.ticket_id
      );
      if (!hasPermission) {
        // Also allow the uploader to delete their own attachments
        if (attachment.uploaded_by !== userContext.userId) {
          throw APIError.permissionDenied(
            "You do not have permission to delete this attachment"
          );
        }
      }

      // Delete from bucket
      await ticketAttachments.remove(attachment.bucket_key);

      // Delete from database
      await db.exec`
        DELETE FROM attachments
        WHERE id = ${attachmentId}
      `;

      return {
        success: true,
      };
    } catch (error) {
      console.error("Failed to delete attachment:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to delete attachment");
    }
  }
);
