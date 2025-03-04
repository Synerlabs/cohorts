import Link from 'next/link';
import { Plus, Building2 } from 'lucide-react';
import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ComponentPermission } from '@/components/ComponentPermission';
import { permissions } from '@/lib/types/permissions';
import RequirementsList from './_components/requirements-list';
import { getOrganizationRequirements } from '@/services/organization-requirements.service';

interface RequirementsPageProps extends OrgAccessHOCProps {}

async function RequirementsPage({ params, org, userPermissions }: RequirementsPageProps) {
  
  // Fetch requirements
  const result = await getOrganizationRequirements(org.id);
  const requirements = result.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Connection Requirements</h2>
          <p className="text-muted-foreground mt-1">
            Define criteria organizations must meet to connect with yours
          </p>
        </div>
        <ComponentPermission requiredPermissions={[permissions.requirements.create]}>
          <Link href={`/@${org.slug}/requirements/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
          </Link>
        </ComponentPermission>
      </div>
      
      {requirements.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>No Connection Requirements</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              Without requirements, any organization can connect to yours. 
              Add requirements to control which organizations can become chapters, 
              affiliates, or departments.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center pt-2 pb-6">
            <ComponentPermission requiredPermissions={[permissions.requirements.create]}>
              <Link href={`/@${org.slug}/requirements/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Set First Requirement
                </Button>
              </Link>
            </ComponentPermission>
          </CardFooter>
        </Card>
      ) : (
        <RequirementsList 
          initialRequirements={requirements} 
          organizationId={org.id} 
          orgSlug={org.slug} 
        />
      )}
    </div>
  );
}

export default withOrgAccess(RequirementsPage, {
  permissions: [permissions.requirements.view],
  onAccessDenied: {
    action: "error"
  }
}); 