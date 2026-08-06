# Design: Sponsor Ad Slots (Staff-Managed)

**Date:** 2026-07-20 (supersedes the 2026-07-14 vendor-billed Stripe design — see appendix)
**Status:** Implemented 2026-08-04 (client confirmed slot framing; uncommitted — pending visual QA)
**Touches protected zones:** None. Sponsor data lives in the existing `market_centers.settings`
JSONB (no migration); no `backend/subscription/`; no `middleware.ts`.

## Summary

Per client direction (2026-07-20): **Conductor handles no sponsor money.** Vendors in real
estate already have established, compliant structures for paying brokerages for advertising;
a vendor paying a third-party SaaS to sponsor a brokerage's tool is the novel arrangement
their compliance departments can't categorize. So payment flows vendor → market center
(at whatever rate the MC negotiates, with markup), and the MC pays Conductor its normal
subscription. Conductor's job is display + management only.

**Multiple sponsors are supported via discrete ad slots — one sponsor per slot.** More
sponsors ⇒ more slot locations, not shared/rotating placements. Sold inventory stays
deterministic: an MC selling "header placement" can guarantee it, and can price each slot
differently.

### v1 slots (3)

| Slot | Where | Content |
|---|---|---|
| `header` | Dashboard header, "Powered by [logo]" | Logo image + hyperlink |
| `dashboardCard` | Activatable 5th box in the dashboard stats row | Uploaded creative + hyperlink |
| `ticketListRow` | Inline ad styled like a ticket row, near top of list | Creative (or logo + name) + hyperlink |

Market center leaders (STAFF_LEADER / ADMIN) manage each slot independently in settings:
enabled toggle, image upload, link URL. No sponsor CRUD, no rotation, no approval workflow —
staff are the publishers.

## Data model (no migration)

Under the existing `market_centers.settings` JSONB:

```jsonc
{
  "sponsorSlots": {
    "header":        { "enabled": true,  "name": "Acme Title Co", "imageKey": "bucketKey", "linkUrl": "https://..." },
    "dashboardCard": { "enabled": false, "name": null, "imageKey": null, "linkUrl": null },
    "ticketListRow": { "enabled": false, "name": null, "imageKey": null, "linkUrl": null }
  }
}
```

Fixed keys, one sponsor per slot. New slot locations later = new keys.

## Backend

- **Asset storage:** new Encore **public bucket** (stable public URLs — these are display
  assets, no signed-URL expiry to manage). Wire-visible names deliberately avoid the word
  "sponsor" (bucket `partner-assets`, API paths `/settings/partner-slots` /
  `/settings/partner-display`) — ad-blocker filter lists match "sponsor" in URLs and would
  block the images/requests for end users. The visible "Sponsored" label stays (honesty);
  only URLs and DOM attributes are neutral. Upload endpoint mirrors the existing
  base64 pattern in `backend/attachments/upload.ts`: raster images only (PNG/JPEG/WebP —
  no SVG, script risk), 5MB cap, key `{marketCenterId}/{slot}/{timestamp}_{name}`.
- **Slot settings endpoints:** `GET/PUT` for the `sponsorSlots` settings slice — same pattern
  as auto-close settings. Guard: **STAFF_LEADER + ADMIN**. Note `canManageMarketCenters()`
  is ADMIN-only today; these endpoints get their own guard rather than loosening MC management.
- **Display endpoint:** enabled slots for the caller's market center with resolved public
  asset URLs. Long React Query stale time; visible to all roles in the MC.

## Frontend

- **Settings** (`frontend/app/dashboard/settings/page.tsx`): a "Sponsors" card alongside
  `AutoCloseSettings` with three sections — one per slot — each with toggle, upload
  (reuse the base64 conversion from `components/ui/tickets/file-upload.tsx`), and link field.
  Header section previews the logo against the burgundy header color (`#6D1C24`) so leaders
  catch dark logos before publishing. Visible to STAFF_LEADER/ADMIN only.
- **Header** (`frontend/app/dashboard/layout.tsx:211-246`): "Powered by [logo]" between the
  Conductor branding and the notifications/user cluster. Links out with
  `target="_blank" rel="noopener sponsored"`.
- **Dashboard card** (`frontend/components/dashboard/admin-dashboard.tsx:518`): when enabled,
  stats grid goes `md:grid-cols-4` → `md:grid-cols-5`; the sponsor `Card` renders the creative
  + link with a small "Sponsored" label. Mobile 2-col grid absorbs the 5th card.
- **Ticket-list row:** one ad row at a fixed position near the top (e.g. after row 3),
  **first page only** so infinite scroll never duplicates it. Client wants it to "look kind of
  like another ticket" — match the row styling but add a small "Sponsored" tag (Gmail-style)
  so agents aren't tricked into opening it as a ticket. Excluded from selection, bulk ops,
  and counts. Lives in the shared row layer (`ticket-list-item-wrapper.tsx`) so all three
  role lists get it.

## Estimate: ~3–4 days

| Piece | Effort |
|---|---|
| Backend: public bucket + upload + slot settings/display endpoints | ~1 d |
| Settings UI: three slot sections (toggle, upload, link, preview) | ~1 d |
| Header display | ~0.25 d |
| Dashboard 5th card | ~0.25–0.5 d |
| Ticket-list ad row (all role lists, infinite-scroll-safe) | ~0.5 d |
| QA + polish (contrast, mobile, empty states) | ~0.5 d |

Build order: backend endpoints → settings UI → header → dashboard card → list row.
Each placement ships independently as its own commit/PR within line limits; the header
(the original ask) can go live before the other two slots exist.

## Explicitly not in v1 (add only on demand)

- More slot locations (trivial to add: new key + display component).
- Multiple sponsors sharing one slot / rotation — reintroduce only if MCs sell out inventory.
- Impression/click stats for MCs to justify pricing to vendors — likely future ask; when it
  comes, promote `sponsorSlots` to a real table (protected-zone migration then, not now).
- Scheduling (start/end dates) — leaders toggle manually for now.

---

## Appendix: superseded design (2026-07-14)

The prior approved design had vendors paying Conductor directly: $599/mo Stripe subscription
per sponsor (setup-mode checkout, bill-on-approval), a coupon covering the MC's base plan,
staff approval workflow, one-sponsor-per-MC exclusivity, public `/sponsors/{slug}` pages with
magic-link vendor self-service, and 7-day grace mirroring MC PAST_DUE. Superseded because
vendor-spend compliance in real estate favors the existing vendor→brokerage advertising
channel over a novel vendor→SaaS arrangement, and the client prefers MCs setting (and marking
up) their own rates. Estimated 7–10 days plus Stripe surface; the replacement is ~3–4 days
with no billing risk.
