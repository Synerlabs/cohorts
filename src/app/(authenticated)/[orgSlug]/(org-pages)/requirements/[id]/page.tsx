import { notFound, redirect } from 'next/navigation';
import { withOrgAccess, OrgAccessHOCProps } from '@/lib/hoc/org';
import RequirementForm from '../_components/requirement-form';
import { getRequirementById } from '@/services/organization-requirements.service';
import { permissions } from '@/lib/types/permissions';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EditRequirementPageProps extends Omit<OrgAccessHOCProps, 'params'> {
  params: {
    orgSlug: string;
    id: string;
  };
}

async function EditRequirementPage({ params, org, userPermissions }: EditRequirementPageProps) {
  // Check if user has permission to edit requirements
  if (!userPermissions.includes(permissions.requirements.edit)) {
    redirect(`/${org.slug}/requirements`);
  }

  const result = await getRequirementById(params.id);
  
  if (!result || !result.data) {
    notFound();
  }
  
  const requirement = result.data;
  
  // Verify this requirement belongs to this organization
  if (requirement.organization_id !== org.id) {
    redirect(`/@${org.slug}/requirements`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/@${org.slug}/requirements`} className="hover:opacity-75 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Requirement</h2>
          <p className="text-muted-foreground mt-1">
            Update an existing connection requirement
          </p>
        </div>
      </div>
      
      <RequirementForm
        orgSlug={org.slug}
        organizationId={org.id}
        initialData={requirement}
        isEditing={true}
      />
    </div>
  );
}

export default withOrgAccess(EditRequirementPage, {
  permissions: [permissions.requirements.view],
  onAccessDenied: {
    action: "error"
  }
}); 