import { redirect } from 'next/navigation';
import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import RequirementForm from '../_components/requirement-form';
import { permissions } from '@/lib/types/permissions';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface NewRequirementPageProps extends OrgAccessHOCProps {}

async function NewRequirementPage({ org, userPermissions }: NewRequirementPageProps) {

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/@${org.slug}/requirements`} className="hover:opacity-75 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Requirement</h2>
          <p className="text-muted-foreground mt-1">
            Define a new connection requirement for other organizations
          </p>
        </div>
      </div>
      
      <RequirementForm
        orgSlug={org.slug}
        organizationId={org.id}
        isEditing={false}
      />
    </div>
  );
}

export default withOrgAccess(NewRequirementPage, {
  permissions: [permissions.requirements.view],
  onAccessDenied: {
    action: "error"
  }
}); 