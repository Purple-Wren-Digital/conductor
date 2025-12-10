import { api, APIError } from "encore.dev/api";
import { ticketAttachments } from "./bucket";
import { db } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canViewTicket } from "../auth/permissions";

// File upload security constraints
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
];

export interface GetSignedUploadUrlRequest {
  ticketId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface GetSignedUploadUrlResponse {
  uploadUrl: string;
  bucketKey: string;
  attachmentId: string;
}

/**
 * Get a signed URL for direct file upload from the client
 * This is more efficient for large files as they don't need to go through the backend
 */
export const getSignedUploadUrl = api<
  GetSignedUploadUrlRequest,
  GetSignedUploadUrlResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/attachments/signed-upload-url",
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

      // Validate file size
      if (req.fileSize > MAX_FILE_SIZE) {
        throw APIError.invalidArgument(
          `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        );
      }

      // Validate mime type
      if (!ALLOWED_MIME_TYPES.includes(req.mimeType)) {
        throw APIError.invalidArgument(
          "File type not allowed. Allowed types: PDF, Word, Excel, CSV, TXT, and images (JPEG, PNG, GIF, WebP, HEIC)"
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

      // Create attachment record in database (will be confirmed after successful upload)
      const attachment = await db.queryRow<{ id: string }>`
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
        RETURNING id
      `;

      if (!attachment) {
        throw APIError.internal("Failed to create attachment record");
      }

      // Generate signed upload URL (valid for 2 hours)
      const uploadUrl = await ticketAttachments.signedUploadUrl(bucketKey, {
        ttl: 7200, // 2 hours
      });

      return {
        uploadUrl: uploadUrl.url,
        bucketKey,
        attachmentId: attachment.id,
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to generate upload URL");
    }
  }
);