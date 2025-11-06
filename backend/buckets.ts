// AWS S3 Bucket
import { Bucket } from "encore.dev/storage/objects";

export const ticketFilesBucket = new Bucket("ticket-files", {
  versioned: false,
});
