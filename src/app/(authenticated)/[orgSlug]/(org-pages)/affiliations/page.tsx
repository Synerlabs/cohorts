import { redirect } from 'next/navigation';
import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getHostOrganizations, getMemberOrganizations } from '@/services/organization-membership.service';
import AffiliationsList from './_components/affiliations-list';

interface AffiliationsPageProps extends OrgAccessHOCProps {}

async function AffiliationsPage({ org, userPermissions }: AffiliationsPageProps) {
  // Fetch parent and child organizations
  const [hostOrgsResult, memberOrgsResult] = await Promise.all([
    getHostOrganizations(org.id),
    getMemberOrganizations(org.id),
  ]);
  
  const hostOrganizations = hostOrgsResult.data || [];
  const memberOrganizations = memberOrgsResult.data || [];
  
  const hasAffiliations = hostOrganizations.length > 0 || memberOrganizations.length > 0;
  const hasError = hostOrgsResult.error || memberOrgsResult.error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Affiliations</h2>
          <p className="text-muted-foreground mt-1">
            Manage connections with other organizations
          </p>
        </div>
        
        <Link href={`/@${org.slug}/affiliations/create`}>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Affiliation
          </Button>
        </Link>
      </div>
      
      {hasError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {hostOrgsResult.error || memberOrgsResult.error}
          </AlertDescription>
        </Alert>
      )}
      
      {!hasError && !hasAffiliations && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="text-xl font-semibold mb-2">No Affiliations Yet</h3>
          <p className="text-muted-foreground mb-4">
            Your organization isn't affiliated with any other organizations yet.
          </p>
          <Link href={`/@${org.slug}/affiliations/create`}>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Your First Affiliation
            </Button>
          </Link>
        </div>
      )}
      
      {!hasError && hasAffiliations && (
        <AffiliationsList 
          parentOrganizations={hostOrganizations}
          childOrganizations={memberOrganizations}
          organizationId={org.id}
          orgSlug={org.slug}
        />
      )}
    </div>
  );
}

export default withOrgAccess(AffiliationsPage, {
  permissions: [permissions.group.edit],
  onAccessDenied: {
    action: "redirect",
    redirectTo: "/dashboard"
  }
}); 