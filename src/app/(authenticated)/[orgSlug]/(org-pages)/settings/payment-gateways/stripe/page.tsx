import { withOrgAccess } from '@/lib/hoc/org';
import { StripeSettingsClient } from './_components/stripe-settings-client';

// Server Component
function StripeSettingsPage({ params }: { params: { orgSlug: string } }) {
  return <StripeSettingsClient params={params} />;
}

export default withOrgAccess(StripeSettingsPage, {
  allowGuest: false,
  permissions: ['manage_payment_gateways']
}); 