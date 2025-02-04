import { withOrgAccess } from '@/lib/hoc/org';
import { StripeSettingsClient } from './_components/stripe-settings-client';
import { OrgAccessHOCProps } from '@/lib/hoc/org';

// Server Component
function StripeSettingsPage({ params, org }: OrgAccessHOCProps & { params: { orgSlug: string } }) {
  if (!org?.id) {
    throw new Error('Organization ID is required');
  }

  return <StripeSettingsClient params={{ orgSlug: params.orgSlug }} orgId={org.id} />;
}

export default withOrgAccess(StripeSettingsPage, {
  allowGuest: false,
  permissions: ['manage_payment_gateways']
}); 