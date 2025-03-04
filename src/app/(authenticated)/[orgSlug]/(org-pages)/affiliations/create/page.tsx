import { redirect } from 'next/navigation';
import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AffiliationForm from '../_components/affiliation-form';

interface CreateAffiliationPageProps extends OrgAccessHOCProps {}

async function CreateAffiliationPage({ org, userPermissions }: CreateAffiliationPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/@${org.slug}/affiliations`} className="hover:opacity-75 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Affiliation</h2>
          <p className="text-muted-foreground mt-1">
            Connect your organization with another organization through membership
          </p>
        </div>
      </div>
      
      <AffiliationForm
        orgSlug={org.slug}
        organizationId={org.id}
        isEditing={false}
      />
    </div>
  );
}

export default withOrgAccess(CreateAffiliationPage, {
  permissions: [permissions.group.edit],
  onAccessDenied: {
    action: "redirect",
    redirectTo: "/dashboard"
  }
}); 