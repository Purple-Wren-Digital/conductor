import { Bucket } from "encore.dev/storage/objects";

/**
 * Bucket for storing ticket attachments
 * Files are private by default and require signed URLs for access
 */
export const ticketAttachments = new Bucket("ticket-attachments", {
  public: false,
  versioned: false,
});