import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';
import { FormTemplatesList } from './_components/form-templates-list';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { FormTemplateService } from '@/services/form-template.service';
import { ComponentPermission } from '@/components/ComponentPermission';

interface FormsPageProps extends OrgAccessHOCProps {
  // Add additional props here
}

async function FormsPage({ org, user, userPermissions }: FormsPageProps) {
  try {
    const templates = await FormTemplateService.getFormTemplates(org.id);

    return (
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Forms</h1>
          <ComponentPermission requiredPermissions={[permissions.forms.create]}>
            <a 
              href={`/@${org.slug}/forms/new`} 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Create Form
            </a>
          </ComponentPermission>
        </div>
        <FormTemplatesList 
          templates={templates} 
          org={org} 
          userPermissions={userPermissions || []}
        />
      </div>
    );
  } catch (error) {
    console.error('Error loading forms:', error);
    return (
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Forms</h1>
          <ComponentPermission requiredPermissions={[permissions.forms.create]}>
            <a 
              href={`/@${org.slug}/forms/new`} 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Create Form
            </a>
            </ComponentPermission>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p>Failed to load forms. Please try again later.</p>
          </div>
        </Card>
      </div>
    );
  }
}

export default withOrgAccess(FormsPage, {
  permissions: [permissions.forms.view],
  onAccessDenied: {
    action: "error",
  }
}); 