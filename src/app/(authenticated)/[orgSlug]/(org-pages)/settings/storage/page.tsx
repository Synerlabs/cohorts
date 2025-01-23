import { withOrgAccess, OrgAccessHOCProps } from "@/lib/hoc/org";
import { StorageSettingsForm } from '../_components/storage-settings-form';
import { permissions } from "@/lib/types/permissions";
import { createClient } from "@/lib/utils/supabase/server";

async function StorageSettingsPage({ org }: OrgAccessHOCProps) {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('org_storage_settings')
    .select('*')
    .eq('org_id', org.id)
    .single();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Storage Settings</h1>
        <p className="text-muted-foreground">Configure where to store uploaded files like proof of payments.</p>
      </div>
      <StorageSettingsForm 
        orgSlug={org.slug} 
        initialData={settings ? {
          id: settings.id,
          orgId: settings.org_id,
          providerType: settings.provider_type,
          credentials: settings.credentials,
          settings: settings.settings,
        } : undefined}
      />
    </div>
  );
}

export default withOrgAccess(StorageSettingsPage, {
  permissions: [permissions.group.edit],
}); 