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
import { OrganizationTier } from "@/lib/types/organization";

export interface AffiliateOrganizationsProps {
  hostGroupId: string;
  affiliateGroupId: string;
}

export async function AffiliateOrganizations({
  hostGroupId,
  affiliateGroupId,
}: AffiliateOrganizationsProps) {
  // Replace with actual service call when implemented
  try {
    const host = await GroupService.getGroupById(hostGroupId);
    const tiers = await OrganizationAffiliationServiceStatic.getTiers({
      hostGroupId,
    });

    if (!tiers || tiers.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No Organization Tiers Available</CardTitle>
            <CardDescription>
              {host?.name} has not created any organization tiers yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Check back later for affiliation opportunities.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Available Tiers from {host?.name}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier: OrganizationTier) => (
            <Card key={tier.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tier.name}</CardTitle>
                  <Badge variant="outline">
                    {tier.config?.relationship_type || "N/A"}
                  </Badge>
                </div>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold">
                      ${(tier.price / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tier.duration_months} months
                    </p>
                  </div>
                  <p className="text-sm">
                    Activation: {tier.activation_type}
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <OrganizationTierEnrollDialog
                  tierId={tier.id}
                  tierName={tier.name}
                  groupId={affiliateGroupId}
                  trigger={<Button className="w-full">Apply for Tier</Button>}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching affiliate organizations:", error);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>
            Failed to load organization tiers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            There was an error loading the organization tiers. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }
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