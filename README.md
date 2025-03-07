# Cohorts

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Fill in the required environment variables

## Stripe Connect Setup (Local Development)

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli#install)
2. Login to your Stripe account:
```bash
stripe login
```
3. Start webhook forwarding (in a separate terminal):
```bash
npm run stripe:webhook
# or
yarn stripe:webhook
```
4. Copy the webhook signing secret from the CLI output and add it to your `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Testing Stripe Connect

1. Go to the Payment Gateways settings page
2. Click "Connect Stripe Account"
3. Use test mode for development
4. Use these test cards for payments:
   - Success: 4242 4242 4242 4242
   - Requires Authentication: 4000 0027 6000 3184
   - Declined: 4000 0000 0000 0002

## Database

To set up the local database:

```bash
# Start Supabase
npm run supabase:start

# Run migrations
npm run db:migrate

# Generate types
npm run db:types
```

## Utility Scripts

### Reset Group Data

A script to reset group users, applications, and memberships for a specific group:

```bash
# Reset all data for a specific group
npx ts-node src/scripts/reset-group-data.ts --group-id <group_id>

# Dry run (show what would be deleted without actually deleting)
npx ts-node src/scripts/reset-group-data.ts --group-id <group_id> --dry-run

# Get help
npx ts-node src/scripts/reset-group-data.ts --help
```

For more details, see the [scripts README](src/scripts/README.md).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

# Duration Unit Fixes

This project has been updated to fix issues with the membership tier duration system.

## Changes Made

1. Fixed form submission to properly handle all duration-related fields
2. Updated the membership form to ensure `duration_unit` is always set correctly
3. Fixed the server-side action to parse and process all duration fields properly

These fixes ensure that the membership form properly submits both `duration_months` and `duration_unit`, and correctly saves fiscal period and fixed dates settings.

## Troubleshooting

If you still encounter issues with the form not submitting duration_unit:
1. Clear your browser cache and reload the page
2. Restart your development server

For any other issues, please create a ticket in the issue tracker.
