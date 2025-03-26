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
    <div className="container py-6 space-y-6">
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/@${orgSlug}/forms`}>Forms</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{template.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
          <div className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Edit Form</h1>
            <Badge variant={isPublished ? "default" : "secondary"} className={cn("ml-2", isPublished ? "bg-green-500" : "")}>
              {isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
          
          {lastUpdated && (
            <div className="flex items-center text-sm text-muted-foreground">
              <CalendarClock className="mr-1 h-4 w-4" />
              Last updated: {format(lastUpdated, 'PPP')}
            </div>
          )}
        </div>
        
        <p className="text-muted-foreground">
          Update your form by modifying fields and settings
        </p>
      </div>
      
      <FormBuilder
        org={org}
        template={template}
        mode="edit"
        userPermissions={userPermissions || []}
      />
      
      <div className="flex justify-start">
        <Link 
          href={`/@${orgSlug}/forms`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Forms
        </Link>
      </div>
    </div>
  );
}

export default withOrgAccess(EditFormPage, {
  permissions: [permissions.forms.edit],
  onAccessDenied: {
    action: "error",
  }
}); 