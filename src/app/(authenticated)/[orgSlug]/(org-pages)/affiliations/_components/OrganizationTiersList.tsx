import { Suspense } from "react";
import { OrganizationAffiliationServiceStatic } from "@/services/organization-affiliation.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EditIcon, UsersIcon, ChevronRightIcon } from "lucide-react";

interface OrganizationTiersListProps {
  hostGroupId: string;
}

export async function OrganizationTiersList({ hostGroupId }: OrganizationTiersListProps) {
  const tiers = await OrganizationAffiliationServiceStatic.getTiers({
    hostGroupId,
  });

  if (!tiers.length) {
    return (
      <Card className="border-dashed border-2 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-xl">No Tiers Created Yet</CardTitle>
          <CardDescription className="text-base">
            Create your first organization tier to allow other organizations to affiliate with yours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Organization tiers let you define different levels of affiliation. Each tier can have its own:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
            <li>Pricing and duration</li>
            <li>Relationship type (chapter, affiliate, etc.)</li>
            <li>Activation requirements</li>
            <li>Hierarchy constraints</li>
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {tiers.map((tier) => (
        <Card key={tier.id} className="flex flex-col hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>{tier.name}</CardTitle>
              <Badge variant="outline" className="capitalize">
                {tier.config.relationship_type}
              </Badge>
            </div>
            <CardDescription className="line-clamp-2">
              {tier.description || "No description provided"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-grow pb-4">
            <div className="flex items-baseline">
              <span className="text-2xl font-bold">
                ${tier.price.toFixed(2)}
              </span>
              {tier.config.relationship_type !== "free" && (
                <span className="text-sm text-muted-foreground ml-1">
                  /tier
                </span>
              )}
            </div>
            <div className="space-y-2 pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Relationship Type:</span>
                <span className="font-medium capitalize">
                  {tier.config.relationship_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activation:</span>
                <span className="font-medium capitalize">
                  {tier.config.relationship_type === "review" ? "Manual approval" : "Automatic"}
                </span>
              </div>
              {tier.organization_count !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Affiliated Orgs:
                  </span>
                  <span className="font-medium">
                    {tier.organization_count}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 gap-2 flex">
            <Button variant="outline" size="sm" className="flex-1 flex items-center gap-2">
              <EditIcon className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 flex items-center gap-2">
              <UsersIcon className="h-3.5 w-3.5" />
              <span>Affiliates</span>
              <ChevronRightIcon className="h-3.5 w-3.5 ml-auto" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export function OrganizationTiersListSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-3/5 mb-2" />
              <Skeleton className="h-5 w-1/4" />
            </div>
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4 flex-grow">
            <Skeleton className="h-8 w-1/3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 gap-2 flex">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export default function OrganizationTiersListWrapper(
  props: OrganizationTiersListProps
) {
  return (
    <Suspense fallback={<OrganizationTiersListSkeleton />}>
      <OrganizationTiersList {...props} />
    </Suspense>
  );
} 