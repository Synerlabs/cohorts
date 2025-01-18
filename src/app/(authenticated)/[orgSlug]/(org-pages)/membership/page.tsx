import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { permissions } from "@/lib/types/permissions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import MembershipTable from "./_components/membership-table";
import MembershipDialog from "./_components/membership-dialog";
import { Suspense } from "react";
import { getMembershipsAction } from "./_actions/membership.action";
import { getMemberships } from "@/services/membership.service";

async function MembershipsPage({ org }: OrgAccessHOCProps) {
  const memberships = await getMemberships({ orgId: org.id });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Memberships</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage membership tiers for your organization.
          </p>
        </div>
        <MembershipDialog orgId={org.id}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Membership
          </Button>
        </MembershipDialog>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <MembershipTable memberships={memberships} />
      </Suspense>
    </div>
  );
}

export default withOrgAccess(MembershipsPage);
