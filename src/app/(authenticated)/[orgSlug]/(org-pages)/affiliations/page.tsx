import { Suspense } from "react";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusIcon, Network, Building2, AlertTriangle } from "lucide-react";
import { OrganizationTierDialog } from "./_components/OrganizationTierDialog";
import OrganizationTiersList from "./_components/OrganizationTiersList";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <CardTitle className="text-destructive text-lg">Error Loading Content</CardTitle>
            <CardDescription className="text-destructive/80">
              There was a problem loading this information
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" className="mt-4" size="sm">
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}

function AffiliationsPage({ org }: OrgAccessHOCProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Organization Affiliations</h2>
          <p className="text-muted-foreground">
            Manage relationships between your organization and others
          </p>
        </div>
      </div>

      <Tabs defaultValue="my-tiers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="my-tiers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>My Tiers</span>
          </TabsTrigger>
          <TabsTrigger value="join-orgs" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            <span>Join Organizations</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-tiers" className="space-y-6 pt-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-lg font-medium">Organization Tiers</h3>
              <p className="text-sm text-muted-foreground">
                Define how other organizations can affiliate with yours
              </p>
            </div>
            <OrganizationTierDialog
              hostGroupId={org.id}
              trigger={
                <Button size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" /> 
                  Create Tier
                </Button>
              }
            />
          </div>
          
          <Suspense fallback={<TiersLoadingSkeleton />}>
            <OrganizationTiersList hostGroupId={org.id} />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="join-orgs" className="space-y-6 pt-4">
          <div>
            <h3 className="text-lg font-medium">Join Other Organizations</h3>
            <p className="text-sm text-muted-foreground">
              Browse and apply to affiliate with other organizations
            </p>
          </div>
          
          <div className="rounded-md border p-8 text-center bg-muted/20">
            <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h4 className="text-lg font-medium mb-2">Coming Soon</h4>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              This feature is in development. Soon you'll be able to discover 
              and join other organizations to build your network.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TiersLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({length: 2}).map((_, i) => (
        <Card key={i} className="w-full">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default withOrgAccess(AffiliationsPage); 