import { Bucket } from "encore.dev/storage/objects";

/**
 * Public bucket for storing vendor-sponsor slot images (header logo,
 * dashboard card, ticket-list row). Publicly readable via CDN so the
 * frontend can render sponsor creative without signed URLs.
 */
// Deliberately NOT named "sponsor-assets": ad-blocker filter lists match
// "sponsor" in URL paths, which would block these images for end users.
export const sponsorAssets = new Bucket("partner-assets", {
  public: true,
  versioned: false,
});
