import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { FormBuilder } from '../../_components/form-builder';
import { notFound } from 'next/navigation';

interface EditFormPageProps extends OrgAccessHOCProps {
  params: Promise<{
    slug: string;
    formId: string;
    orgSlug: string;
  }>;
}

async function EditFormPage({ org, user, params }: EditFormPageProps) {
  const {formId} = await params;
  const supabase = await createServiceRoleClient();

  const { data: template, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('id', formId)
    .eq('org_id', org.id)
    .single();

  if (error || !template) {
    notFound();
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Edit Form</h1>
        <p className="text-muted-foreground mt-1">
          Update your form by modifying fields and settings.
        </p>
      </div>
      <FormBuilder
        org={org}
        template={template}
        mode="edit"
      />
    </div>
  );
}

export default withOrgAccess(EditFormPage, {
  permissions: [permissions.forms.edit],
  allowGuest: false
}); 