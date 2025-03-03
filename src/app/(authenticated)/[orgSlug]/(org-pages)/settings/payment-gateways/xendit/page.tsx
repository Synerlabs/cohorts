import { withOrgAccess } from '@/lib/hoc/org';
import { XenditSettingsClient } from './_components/xendit-settings-client';
import { OrgAccessHOCProps } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';

// Server Component
async function XenditSettingsPage({ params, org }: OrgAccessHOCProps & { params: { orgSlug: string } }) {
  const { orgSlug } = params;
  if (!org?.id) {
    throw new Error('Organization ID is required');
  }

  return <XenditSettingsClient params={{ orgSlug }} orgId={org.id} />;
}

export default withOrgAccess(XenditSettingsPage, {
  permissions: [permissions.paymentGateways.configure],
  onAccessDenied: { action: 'error' }
}); 