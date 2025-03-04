import { Suspense } from "react";
import { OrganizationAffiliationServiceStatic } from "@/services/organization-affiliation.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ChildOrganizationsProps {
  groupId: string;
}

export async function ChildOrganizations({
  groupId,
}: ChildOrganizationsProps) {
  // This would be replaced with the actual service call when implemented
  const affiliations = await OrganizationAffiliationServiceStatic.getChildAffiliations(groupId);

  if (!affiliations.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Child Organizations</CardTitle>
          <CardDescription>
            Your organization has no child organization affiliations.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {affiliations.map((affiliation) => (
        <Card key={affiliation.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{affiliation.child.name}</CardTitle>
              <Badge variant="outline">
                {affiliation.tier.relationship_type}
              </Badge>
            </div>
            <CardDescription>
              {affiliation.tier.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Status:</span>{" "}
                <Badge variant={affiliation.status === "active" ? "default" : "secondary"}>
                  {affiliation.status}
                </Badge>
              </p>
              {affiliation.expiry_date && (
                <p className="text-sm">
                  <span className="font-medium">Expires:</span>{" "}
                  {new Date(affiliation.expiry_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChildOrganizationsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ChildOrganizationsWrapper(
  props: ChildOrganizationsProps
) {
  return (
    <Suspense fallback={<ChildOrganizationsSkeleton />}>
      <ChildOrganizations {...props} />
    </Suspense>
  );
} 