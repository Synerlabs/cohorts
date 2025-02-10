import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';
import { FormBuilder } from '../_components/form-builder';

interface NewFormPageProps extends OrgAccessHOCProps {
  // Add additional props here
}

async function NewFormPage({ org, user }: NewFormPageProps) {
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create Form</h1>
        <p className="text-muted-foreground mt-1">
          Design your form by adding and configuring fields.
        </p>
      </div>
      <FormBuilder org={org} />
    </div>
  );
}

export default withOrgAccess(NewFormPage, {
  permissions: [permissions.forms.create],
  allowGuest: false
}); 