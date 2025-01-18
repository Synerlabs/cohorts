import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { Button } from "@/components/ui/button";
import Link from "next/link";

async function OrgHomePage({
  user,
  org,
  isGuest,
  params,
  searchParams,
}: OrgAccessHOCProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
        <p className="text-sm text-muted-foreground">
          {org.description}
        </p>
      </div>

      {isGuest && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Join {org.name}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You are currently viewing this organization as a guest. Join to access member features.
          </p>
          <Button asChild>
            <Link href={`/@${org.slug}/join`}>Join Now</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default withOrgAccess(OrgHomePage, { allowGuest: true });
