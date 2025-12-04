import { api, APIError } from "encore.dev/api";
import { ticketAttachments } from "./bucket";
import { db } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canViewTicket } from "../auth/permissions";

export interface UploadAttachmentRequest {
  ticketId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  content: string; // Base64 encoded file content
}

export interface UploadAttachmentResponse {
  attachment: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    ticketId: string;
    uploadedBy: string;
    createdAt: Date;
    downloadUrl?: string;
  };
}

/**
 * Upload a file attachment to a ticket
 */
export const upload = api<UploadAttachmentRequest, UploadAttachmentResponse>(
  {
    expose: true,
    method: "POST",
    path: "/attachments/upload",
    auth: true,
  },
  async (req) => {
    try {
      const userContext = await getUserContext();

      // Check if user has permission to view/update the ticket
      const hasPermission = await canViewTicket(userContext, req.ticketId);
      if (!hasPermission) {
        throw APIError.permissionDenied(
          "You do not have permission to add attachments to this ticket"
        );
      }

      // Verify the ticket exists
      const ticket = await db.queryRow<{ id: string }>`
        SELECT id FROM tickets WHERE id = ${req.ticketId}
      `;

      if (!ticket) {
        throw APIError.notFound("Ticket not found");
      }

      // Generate a unique key for the file in the bucket
      const timestamp = Date.now();
      const sanitizedFileName = req.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const bucketKey = `${req.ticketId}/${timestamp}_${sanitizedFileName}`;

      // Decode base64 content
      const fileBuffer = Buffer.from(req.content, "base64");

      // Upload file to bucket
      await ticketAttachments.upload(bucketKey, fileBuffer, {
        contentType: req.mimeType,
      });

      // Save attachment metadata to database
      const attachment = await db.queryRow<{
        id: string;
        file_name: string;
        file_size: number;
        mime_type: string;
        ticket_id: string;
        uploaded_by: string;
        created_at: Date;
      }>`
        INSERT INTO attachments (
          file_name,
          file_size,
          mime_type,
          bucket_key,
          ticket_id,
          uploaded_by,
          created_at,
          updated_at
        ) VALUES (
          ${req.fileName},
          ${req.fileSize},
          ${req.mimeType},
          ${bucketKey},
          ${req.ticketId},
          ${userContext.userId},
          NOW(),
          NOW()
        )
        RETURNING id, file_name, file_size, mime_type, ticket_id, uploaded_by, created_at
      `;

      if (!attachment) {
        throw APIError.internal("Failed to create attachment record");
      }

      // Generate a signed download URL (valid for 1 hour)
      const downloadUrl = await ticketAttachments.signedDownloadUrl(bucketKey, {
        ttl: 3600, // 1 hour
      });

      return {
        attachment: {
          id: attachment.id,
          fileName: attachment.file_name,
          fileSize: attachment.file_size,
          mimeType: attachment.mime_type,
          ticketId: attachment.ticket_id,
          uploadedBy: attachment.uploaded_by,
          createdAt: attachment.created_at,
          downloadUrl: downloadUrl.url,
        },
      };
    } catch (error) {
      console.error("Failed to upload attachment:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to upload attachment");
    }
  }
);