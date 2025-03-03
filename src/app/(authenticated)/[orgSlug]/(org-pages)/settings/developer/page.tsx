import { withOrgAccess } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';
import { OrgAccessHOCProps } from '@/lib/hoc/org';
import { FeatureFlags } from './_components/feature-flags';

// Server Component
async function DeveloperSettingsPage({ params, org }: OrgAccessHOCProps & { params: { orgSlug: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Developer Settings</h3>
        <p className="text-sm text-muted-foreground">
          These settings are only meant for development and testing.
        </p>
      </div>
      
      <FeatureFlags />
    </div>
  );
}

export default withOrgAccess(DeveloperSettingsPage, {
  permissions: ['admin'], // Restrict to admins
  onAccessDenied: { action: 'error' }
}); 