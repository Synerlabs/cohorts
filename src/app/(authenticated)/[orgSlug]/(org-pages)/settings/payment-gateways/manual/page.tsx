import { withOrgAccess } from '@/lib/hoc/org';
import { ManualSettingsClient } from './_components/manual-settings-client';

// Server Component
function ManualPaymentSettingsPage({ params }: { params: { orgSlug: string } }) {
  return <ManualSettingsClient params={params} />;
}

export default withOrgAccess(ManualPaymentSettingsPage, {
  allowGuest: false,
  permissions: ['manage_payment_gateways']
}); 