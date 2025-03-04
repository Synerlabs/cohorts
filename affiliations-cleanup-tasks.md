# Affiliation System Cleanup Tasks

## Database Migration Tasks
- [x] Create new organization_membership table migration (20250303083821_organization_membership.sql)
- [ ] Create migration to revert unused relationship tables

## Service Files
- [x] Create new organization-membership.service.ts
- [x] Delete src/services/organization-relationships.service.ts

## Component Files to Update
- [x] Update src/app/(authenticated)/[orgSlug]/(org-pages)/affiliations/page.tsx
- [x] Update src/app/(authenticated)/[orgSlug]/(org-pages)/affiliations/_components/affiliations-list.tsx
- [x] Update src/app/(authenticated)/[orgSlug]/(org-pages)/affiliations/_components/affiliation-item.tsx
- [x] Update src/app/(authenticated)/[orgSlug]/(org-pages)/affiliations/create/page.tsx
- [x] Update src/app/(authenticated)/[orgSlug]/(org-pages)/affiliations/_components/affiliation-form.tsx

## Documentation
- [x] Update docs/implementation-status.md to reflect new approach
- [ ] Update other documentation files as needed

## Server Actions
- [x] Create new organization-membership.actions.ts
- [x] Delete src/server/actions/organization-relationships.actions.ts

## API Routes
- [ ] Update or delete API routes related to relationship types and relationships

## Type Definitions
- [x] Update database.types.ts to include organization_membership types

This refactoring changes the way affiliations work:
1. Instead of a separate relationship system, organizations will establish memberships with other organizations
2. We'll leverage the existing membership system's capabilities for applications, approvals, and payments
3. Requirements will be enforced through the membership tier system 