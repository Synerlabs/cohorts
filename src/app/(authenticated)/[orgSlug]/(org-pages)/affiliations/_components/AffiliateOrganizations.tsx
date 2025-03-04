import { Suspense } from "react";
import { OrganizationAffiliationServiceStatic } from "@/services/organization-affiliation.service";
import { GroupService } from "@/services/group.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Clock,
  Building2,
  Users
} from "lucide-react";
import { OrganizationTierCard } from "./OrganizationTierCard";
import { OrganizationTierEnrollDialog } from "./OrganizationTierEnrollDialog";
import { Skeleton } from "@/components/ui/skeleton";

export interface AffiliateOrganizationsProps {
  hostGroupId: string;
  affiliateGroupId: string;
}

export async function AffiliateOrganizations({
  hostGroupId,
  affiliateGroupId,
}: AffiliateOrganizationsProps) {
  const tiers = await OrganizationAffiliationServiceStatic.getTiers({
    hostGroupId,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Available Affiliation Tiers</h2>
      <p className="text-muted-foreground">
        Select a tier to apply for affiliation with this organization.
      </p>

      {tiers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Tiers Available</CardTitle>
            <CardDescription>
              This organization has not created any affiliation tiers yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tier.config.name}</CardTitle>
                  <Badge variant="outline">
                    {tier.config.relationship_type}
                  </Badge>
                </div>
                <CardDescription>{tier.config.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold">
                      ${tier.config.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tier.config.duration_months} months
                    </p>
                  </div>
                  <p className="text-sm">
                    Activation: {tier.config.activation_type}
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <OrganizationTierEnrollDialog
                  tierId={tier.id}
                  tierName={tier.config.name}
                  groupId={affiliateGroupId}
                  trigger={<Button className="w-full">Apply for Tier</Button>}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function AffiliateOrganizationsSkeleton() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Available Affiliation Tiers</h2>
      <p className="text-muted-foreground">
        Select a tier to apply for affiliation with this organization.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent className="flex-grow">
              <Skeleton className="h-8 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AffiliateOrganizationsWrapper(
  props: AffiliateOrganizationsProps
) {
  return (
    <Suspense fallback={<AffiliateOrganizationsSkeleton />}>
      <AffiliateOrganizations {...props} />
    </Suspense>
  );
} 