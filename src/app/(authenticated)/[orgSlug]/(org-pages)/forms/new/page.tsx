import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';
import { FormBuilder } from '../_components/form-builder';

interface NewFormPageProps extends OrgAccessHOCProps {
  // Add additional props here
}

function NewFormPage({ org, userPermissions }: NewFormPageProps) {
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create Form</h1>
        <p className="text-muted-foreground mt-1">
          Create a new form by adding fields and configuring settings.
        </p>
      </div>
      <FormBuilder 
        org={org} 
        mode="create"
        userPermissions={userPermissions || []}
      />
    </div>
  );
}

export default withOrgAccess(NewFormPage, {
  permissions: [permissions.forms.create],
  onAccessDenied: {
    action: 'error'
  }
}); 