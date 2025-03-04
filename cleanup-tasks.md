# Affiliation System Cleanup Tasks

## Database Migration Tasks
- [x] Create new organization_membership table migration (20250501000000_organization_membership.sql)
- [x] Create migration to revert unused relationship tables (20250501000001_revert_relationship_tables.sql)

## Service Files
- [x] Create new organization-membership.service.ts
- [ ] Delete src/services/organization-relationships.service.ts (after components are updated)

## Component Files to Update
- [ ] Update src/app/(authenticated)/[orgSlug]/(org-pages)/affiliations/page.tsx
- [ ] Update src/app/(authenticated)/[orgSlug]/(org-pages)/affiliations/_components/affiliations-list.tsx
- [ ] Update src/app/(authenticated)/[orgSlug]/(org-pages)/affiliations/_components/affiliation-item.tsx
- [ ] Update src/app/(authenticated)/[orgSlug]/(org-pages)/affiliations/create/page.tsx
- [ ] Update src/app/(authenticated)/[orgSlug]/(org-pages)/affiliations/_components/affiliation-form.tsx

## Documentation
- [x] Update docs/implementation-status.md to reflect new approach
- [ ] Update other documentation files as needed

## Server Actions
- [ ] Create new organization-membership.actions.ts
- [ ] Delete src/server/actions/organization-relationships.actions.ts (after components are updated)

## API Routes
- [ ] Update or delete API routes related to relationship types and relationships

## Type Definitions
- [ ] Update database.types.ts to include organization_membership types

This refactoring changes the way affiliations work:
1. Instead of a separate relationship system, organizations will establish memberships with other organizations
2. We'll leverage the existing membership system's capabilities for applications, approvals, and payments
3. Requirements will be enforced through the membership tier system 