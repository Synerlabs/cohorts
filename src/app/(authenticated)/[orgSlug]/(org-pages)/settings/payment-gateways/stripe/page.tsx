import { withOrgAccess } from '@/lib/hoc/org';
import { StripeSettingsClient } from './_components/stripe-settings-client';
import { OrgAccessHOCProps } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';

// Server Component
async function StripeSettingsPage({ params, org }: OrgAccessHOCProps & { params: { orgSlug: string } }) {
  const { orgSlug } = await params;
  if (!org?.id) {
    throw new Error('Organization ID is required');
  }

  return <StripeSettingsClient params={{ orgSlug }} orgId={org.id} />;
}

export default withOrgAccess(StripeSettingsPage, {
  permissions: [permissions.paymentGateways.configure],
  onAccessDenied: { action: 'error' }
}); 