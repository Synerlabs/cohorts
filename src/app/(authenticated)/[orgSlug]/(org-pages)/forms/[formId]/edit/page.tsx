import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { FormBuilder } from '../../_components/form-builder';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EditFormPageProps extends OrgAccessHOCProps {
  params: Promise<{
    slug: string;
    formId: string;
    orgSlug: string;
  }>;
}

async function EditFormPage({ org, user, userPermissions, params }: EditFormPageProps) {
  const {formId, orgSlug} = await params;
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

  const isPublished = template.status === 'published';
  const lastUpdated = template.updated_at ? new Date(template.updated_at) : null;

  return (
    <div className="container max-w-6xl py-10 space-y-10">
      {/* Page Header with Breadcrumb */}
      
      {/* Form Builder Component */}
      <FormBuilder
        org={org}
        template={template}
        mode="edit"
        userPermissions={userPermissions || []}
      />
    </div>
  );
}

export default withOrgAccess(EditFormPage, {
  permissions: [permissions.forms.edit],
  onAccessDenied: {
    action: "error",
  }
}); 