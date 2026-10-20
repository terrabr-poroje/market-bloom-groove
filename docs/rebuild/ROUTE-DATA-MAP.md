# Existing route and data-contract inventory

This inventory is a planning aid for the clean rebuild. It does not authorize production changes.

## Existing route surface observed in the repository
- Public/core: `/`, `/about`, `/contact`, `/guide`, `/rules`
- Authentication and account: `/auth`, `/reset-password`, `/account`, `/membership`, `/member-home`
- Marketplace: `/announce`, `/requests`, `/store/$memberId`
- Admin: `/admin-login`, `/admin-reset-password`, `/admin`
- Legacy/preview route files also exist for buyer/seller/supplier login and account/order/purchase previews. Do not expose or treat these as approved product routes until each is reviewed.

## Proposed primary navigation for the rebuilt UI
1. Home
2. Sign in / sign up
3. Find loads / buyer requests
4. Announce load (approved supplier/seller roles only)
5. Member storefront
6. Account and membership status
7. Admin and city-manager areas (authorized users only)

## Domain concepts that must remain explicit
- Account identity and approved roles are separate concerns.
- User roles include buyer types and marketplace supply-side roles; one account may later hold multiple approved roles.
- Membership approval is required before eligible supply-side accounts can publish loads.
- Regular buyers are restricted to their own city; special buyers can see their city plus configured neighboring cities; professional buyers follow the approved unrestricted city rule.
- City managers are scoped to assigned cities; global admins have broader management rights.
- Loads include product and variety separately, quality, package/weight, stock/count, minimum quantity, sale type and pricing tiers, readiness/validity, seller/member reference, city/province, and optional photos.
- Requests/orders need a validated lifecycle and pricing snapshot; payment/delivery/OTP behaviors must not be represented as complete until their integrations are verified.
- Seller bank and financial ledger records are sensitive; client-side UI must never bypass trusted server-side operations or RLS.
- Ratings and private rating messages have visibility and ownership rules.
- Cities and neighboring-city relationships are existing reference data; do not reseed or replace them without a reviewed migration.

## Database migration rule
The existing Supabase project is the current source of truth. No table drops, renames, destructive migrations, bulk reseeds, RLS changes, auth changes, or data-copy operations may be run against it as part of the rebuild without a separate explicit approval.

## Known verification gap
Current production workflow smoke checks test HTTP status and page text only. Rebuild CI must add browser-level tests for JavaScript hydration, page errors, console errors, interaction behavior, loading completion, and core user flows. Browser tests should use isolated test accounts/fixtures, not real customer or admin credentials.
