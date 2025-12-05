import { api, APIError } from "encore.dev/api";
import { db } from "../ticket/db";
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
      const attachments = await db.queryAll<{
        id: string;
        file_name: string;
        file_size: number;
        mime_type: string;
        uploaded_by: string;
        created_at: Date;
        uploader_name: string | null;
        uploader_email: string;
      }>`
        SELECT
          a.id,
          a.file_name,
          a.file_size,
          a.mime_type,
          a.uploaded_by,
          a.created_at,
          u.name as uploader_name,
          u.email as uploader_email
        FROM attachments a
        LEFT JOIN users u ON a.uploaded_by = u.id
        WHERE a.ticket_id = ${ticketId}
        ORDER BY a.created_at DESC
      `;

      return {
        attachments: attachments.map((attachment) => ({
          id: attachment.id,
          fileName: attachment.file_name,
          fileSize: attachment.file_size,
          mimeType: attachment.mime_type,
          uploadedBy: attachment.uploaded_by,
          uploaderName: attachment.uploader_name || attachment.uploader_email,
          createdAt: attachment.created_at,
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