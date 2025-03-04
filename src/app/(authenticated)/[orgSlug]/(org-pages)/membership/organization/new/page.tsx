import { redirect } from 'next/navigation';
import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationTierForm } from './_components/organization-tier-form';

export default withOrgAccess(function CreateOrganizationTierPage({ org }: OrgAccessHOCProps) {
  if (!org) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Organization Tier</h2>
        <p className="text-muted-foreground">
          Define a new membership tier for organizations to join your community
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <OrganizationTierForm orgId={org.id} orgSlug={org.slug} />
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About Organization Tiers</CardTitle>
              <CardDescription>
                Organization tiers define how external organizations can join and interact with your community
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Pricing</h3>
                <p className="text-sm text-muted-foreground">
                  Set membership fees for organizations. Free tiers are available for non-commercial partnerships.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Duration</h3>
                <p className="text-sm text-muted-foreground">
                  Define how long the membership lasts before renewal is required.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Activation Process</h3>
                <p className="text-sm text-muted-foreground">
                  Control how organizations join - automatically, with admin review, or requiring payment.
                  You can also require application forms for more detailed information.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Active Status</h3>
                <p className="text-sm text-muted-foreground">
                  Tiers can be active or inactive. Inactive tiers won't be visible to organizations looking to join.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}, {
  permissions: [permissions.memberships.create],
  onAccessDenied: {
    action: "redirect",
    redirectTo: "/dashboard"
  }
}); 