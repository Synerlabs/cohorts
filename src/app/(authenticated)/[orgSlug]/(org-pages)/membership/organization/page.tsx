import { redirect } from 'next/navigation';
import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';
import Link from 'next/link';
import { ArrowLeft, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizationTiers } from '../../membership/_components/organization-tiers';
import { Heading } from '@/components/ui/heading';

interface OrganizationTiersPageProps extends OrgAccessHOCProps {}

async function OrganizationTiersPage({ org }: OrganizationTiersPageProps) {
  if (!org) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/@${org.slug}/affiliations`} className="text-muted-foreground hover:text-foreground">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Affiliations</span>
              </Button>
            </Link>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Organization Memberships</h2>
          <p className="text-muted-foreground mt-1">
            Manage membership tiers for organizations that can join your community
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href={`/@${org.slug}/membership`}>
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Manage User Memberships
            </Button>
          </Link>
        </div>
      </div>
      
      <Tabs defaultValue="tiers">
        <TabsList>
          <TabsTrigger value="tiers">
            <Building2 className="h-4 w-4 mr-2" />
            Membership Tiers
          </TabsTrigger>
          <TabsTrigger value="current">
            Current Affiliations
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Requests
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tiers" className="mt-6">
          <OrganizationTiers orgId={org.id} orgSlug={org.slug} />
        </TabsContent>
        
        <TabsContent value="current" className="mt-6">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Current Affiliations</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              View and manage organizations affiliated with your community.
            </p>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </TabsContent>
        
        <TabsContent value="pending" className="mt-6">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Pending Requests</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Review and approve organizations that have requested to join your community.
            </p>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withOrgAccess(OrganizationTiersPage, {
  permissions: [permissions.group.edit],
  onAccessDenied: {
    action: "redirect",
    redirectTo: "/dashboard"
  }
}); 