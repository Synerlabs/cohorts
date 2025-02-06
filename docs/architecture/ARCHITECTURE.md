# Platform Architecture

## Overview
This is a multi-tenant platform designed for communities, non-profit organizations, clubs, and student organizations to manage memberships and payments. The platform uses Next.js 15, React 19, and Supabase, following a server-first approach with React Server Actions.

## Tech Stack
- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Next.js API Routes, React Server Actions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payment Processing**: Stripe
- **Hosting**: [Your hosting platform]

## Key Architecture Decisions
1. **Multi-tenancy**: Organizations are isolated by `org_slug` in the URL structure
2. **Server-First Approach**: Utilizing React Server Actions for most data mutations
3. **Route Structure**:
   - `(public)/*`: Public-facing pages
   - `(authenticated)/*`: Protected routes requiring authentication
   - `api/*`: API endpoints
   - `[orgSlug]/*`: Organization-specific routes

## Core Features
1. Organization Management
2. Membership Plans
3. User Authentication & Authorization
4. Payment Processing
5. Member Verification

## Database Schema Overview
Key tables:
- organizations
- members
- membership_plans
- payments
- stripe_connected_accounts

## Security Considerations
1. Multi-tenant data isolation
2. Payment information security
3. Member data privacy
4. Role-based access control 